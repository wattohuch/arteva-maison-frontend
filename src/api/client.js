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

export function getAuthToken() {
  return localStorage.getItem('arteva_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('arteva_token', token);
  } else {
    localStorage.removeItem('arteva_token');
  }
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
 * Core fetch wrapper. Attaches the JWT, applies a timeout, and converts every
 * failure into an ApiError carrying status/code/details.
 */
export async function apiRequest(endpoint, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, headers: extraHeaders, signal, ...rest } = options;
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  // Honour a caller-supplied signal alongside our timeout.
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  let response;
  try {
    response = await fetch(url, {
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
  } catch (err) {
    clearTimeout(timer);
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
  clearTimeout(timer);

  const data = await readBody(response);

  if (!response.ok) {
    // A rejected token should not leave a stale session behind.
    if (response.status === 401 && token) setAuthToken(null);

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
  const token = getAuthToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(url, {
      method,
      body: formData,
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new ApiError(
      err.name === 'AbortError' ? 'The upload timed out.' : 'Upload failed. Please try again.',
      { status: err.name === 'AbortError' ? 408 : 0, code: 'UPLOAD_FAILED' }
    );
  }
  clearTimeout(timer);

  const data = await readBody(response);
  if (!response.ok) {
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
  const token = getAuthToken();

  const response = await fetch(url, {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch resource (${response.status})`, {
      status: response.status,
      code: 'FETCH_FAILED',
    });
  }

  return response.text();
}
