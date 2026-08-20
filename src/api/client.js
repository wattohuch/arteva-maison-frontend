/**
 * ARTÉVA Maison — API client
 */

export const API_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://arteva-maison-backend-gy1x.onrender.com/api';

export function getApiBaseUrl() {
  return API_BASE_URL;
}

const TOKEN_KEY = 'arteva_token';
const REFRESH_KEY = 'arteva_refresh_token';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_KEY);
  }
}

/**
 * Fired when the session is genuinely over and could not be renewed.
 *
 * AuthContext listens for it and clears its React state. Before this existed,
 * this module deleted the token from localStorage while React went on holding
 * `token` in state: the UI still looked signed in, every request went out
 * unauthenticated, and the screen filled with "Not Authorized" until the user
 * happened to reload. Storage and state now always end a session together.
 */
export const SESSION_ENDED_EVENT = 'arteva:session-ended';

/**
 * The ONLY responses that end a session.
 *
 * The old rule was "any 401 clears the token", which is what made the
 * dashboard so fragile. A 401 can mean the token is bad — but the API also
 * answered 401 for a mistyped revenue password, a failed re-authentication
 * prompt and a wrong OTP. All three destroyed a perfectly valid admin session,
 * which is the "Not Authorized after using the panel for a while" report.
 *
 * The server now marks the genuine cases with these codes and uses 4xx without
 * them for everything else, so this client no longer has to guess.
 */
const SESSION_CODES = new Set([
  'SESSION_NO_TOKEN',
  'SESSION_EXPIRED',
  'SESSION_INVALID',
  'SESSION_USER_GONE',
]);

/** Endpoints that must never be retried after a refresh — they ARE the auth. */
const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function endSession() {
  setAuthToken(null);
  setRefreshToken(null);
  window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT));
}

/**
 * In-flight refresh, shared by every caller.
 *
 * A dashboard screen fires half a dozen requests at once. When the access token
 * has just expired they all come back 401 together, and without this each one
 * would start its own refresh. Because refresh tokens ROTATE, the first to land
 * invalidates the token the others are still holding — the server sees a spent
 * token replayed, reads it as theft, and revokes every session on the account.
 * Concurrent expiry would therefore have logged the user out *harder* than no
 * refresh at all.
 *
 * So exactly one refresh runs; everyone else awaits the same promise.
 */
let refreshInFlight = null;

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) return null;

        const body = await response.json().catch(() => null);
        const next = body?.data;
        if (!next?.token) return null;

        setAuthToken(next.token);
        if (next.refreshToken) setRefreshToken(next.refreshToken);
        return next;
      } catch {
        // Offline mid-refresh. Not a dead session — the caller surfaces the
        // network error and the next attempt can try again.
        return null;
      } finally {
        // Cleared in a microtask so callers that awaited this promise have all
        // resumed and read the new token before another refresh can start.
        queueMicrotask(() => { refreshInFlight = null; });
      }
    })();
  }

  return refreshInFlight;
}

/**
 * Revenue unlock token.
 *
 * Kept in sessionStorage rather than localStorage so it dies with the tab: the
 * point of the revenue password is that walking away closes the books, and a
 * token that survives a browser restart would defeat that.
 */
const REVENUE_TOKEN_KEY = 'arteva_revenue_token';

export function getRevenueToken() {
  try {
    return sessionStorage.getItem(REVENUE_TOKEN_KEY);
  } catch {
    return null; // private mode with storage blocked
  }
}

export function setRevenueToken(token) {
  try {
    if (token) sessionStorage.setItem(REVENUE_TOKEN_KEY, token);
    else sessionStorage.removeItem(REVENUE_TOKEN_KEY);
  } catch { /* the owner just re-enters the password */ }
}

/** Default per-request timeout. */
const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Error carrying everything the API told us.
 *
 * The previous client threw a bare `Error(message)`, so callers could not tell a
 * validation failure from an outage — which is why checkout could not react to
 * the gateway being unavailable. `code` mirrors the backend's stable identifier.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details, requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** True when retrying later could plausibly succeed. */
  get isTransient() {
    return (
      this.status === 0 ||
      this.status === 408 ||
      this.status === 429 ||
      this.status >= 500
    );
  }

  /** True when the user has been signed out and has to log in again. */
  get isSessionEnded() {
    return SESSION_CODES.has(this.code);
  }
}

/** Parses a response body as JSON, tolerating empty and non-JSON payloads. */
async function readBody(response) {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Proxies and cold-start pages return HTML; surface a usable snippet
    // instead of letting JSON.parse throw an opaque SyntaxError.
    return { __raw: text.slice(0, 200) };
  }
}

/**
 * Core fetch wrapper. Attaches the JWT, applies a timeout, transparently
 * renews an expired access token, and converts every failure into an ApiError
 * carrying status/code/details.
 */
export async function apiRequest(endpoint, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, headers: extraHeaders, signal, ...rest } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  const send = async (token) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    // Honour a caller-supplied signal alongside our timeout.
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

    try {
      return await fetch(url, {
        ...rest,
        // Headers are merged last so a caller passing `headers` can no longer
        // wipe out the Authorization header (it used to, silently).
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...extraHeaders,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let response;
  try {
    response = await send(getAuthToken());
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', {
        status: 408,
        code: 'REQUEST_TIMEOUT',
      });
    }
    throw new ApiError('Unable to reach the server. Please check your connection.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  let data = await readBody(response);

  /* ── Session renewal ──
   *
   * An expired access token is an ordinary, expected event now that they are
   * short-lived: renew it and replay the request once. The user should never
   * see it happen. Only a refresh that actually fails ends the session.
   */
  if (
    response.status === 401 &&
    data?.code === 'SESSION_EXPIRED' &&
    !NO_RETRY.some(path => endpoint.startsWith(path))
  ) {
    const renewed = await refreshSession();

    if (renewed?.token) {
      try {
        response = await send(renewed.token);
        data = await readBody(response);
      } catch {
        throw new ApiError('Unable to reach the server. Please check your connection.', {
          status: 0,
          code: 'NETWORK_ERROR',
        });
      }
    }
  }

  if (!response.ok) {
    // Only a genuine session failure clears the credentials. A 403, or a 401
    // without one of these codes, leaves the session exactly as it was.
    if (response.status === 401 && SESSION_CODES.has(data?.code)) {
      endSession();
    }

    throw new ApiError(
      data?.message || `Request failed (${response.status})`,
      {
        status: response.status,
        code: data?.code || `HTTP_${response.status}`,
        details: data?.details,
        requestId: data?.requestId || response.headers.get('X-Request-Id') || undefined,
      }
    );
  }

  return data ?? {};
}

/** Raw fetch for FormData uploads (no Content-Type — the browser sets the boundary). */
export async function apiUpload(endpoint, method, formData, { timeout = 60000 } = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const send = async (token) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, {
        method,
        body: formData,
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let response;
  try {
    response = await send(getAuthToken());
  } catch (err) {
    throw new ApiError(
      err.name === 'AbortError' ? 'The upload timed out.' : 'Upload failed. Please try again.',
      { status: err.name === 'AbortError' ? 408 : 0, code: 'UPLOAD_FAILED' }
    );
  }

  let data = await readBody(response);

  // Uploads are long; an access token can easily expire mid-transfer. Retried
  // once, because losing a five-image product save to a token rollover is a
  // genuinely bad experience and the body is still in hand.
  if (response.status === 401 && data?.code === 'SESSION_EXPIRED') {
    const renewed = await refreshSession();
    if (renewed?.token) {
      response = await send(renewed.token);
      data = await readBody(response);
    }
  }

  if (!response.ok) {
    if (response.status === 401 && SESSION_CODES.has(data?.code)) {
      endSession();
    }
    throw new ApiError(data?.message || `Upload failed (${response.status})`, {
      status: response.status,
      code: data?.code || 'UPLOAD_FAILED',
      requestId: data?.requestId,
    });
  }
  return data ?? {};
}

/** Raw text fetch (receipt HTML). */
export async function apiText(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;

  const send = (token) => fetch(url, {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });

  let response = await send(getAuthToken());

  if (response.status === 401) {
    const renewed = await refreshSession();
    if (renewed?.token) response = await send(renewed.token);
  }

  if (!response.ok) {
    throw new ApiError(`Failed to fetch resource (${response.status})`, {
      status: response.status,
      code: 'FETCH_FAILED',
    });
  }

  return response.text();
}
