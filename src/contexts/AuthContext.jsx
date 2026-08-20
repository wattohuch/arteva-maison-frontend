import {
  createContext, useContext, useState, useCallback, useEffect, useMemo,
} from 'react';
import { AuthAPI } from '../api/auth';
import {
  setAuthToken, getAuthToken, setRefreshToken, getRefreshToken, SESSION_ENDED_EVENT,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('arteva_user') || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => getAuthToken());
  const [loading, setLoading] = useState(false);
  // False until the stored token has been verified against the server. Route
  // guards wait on this so admin UI never flashes before authorisation lands.
  const [authChecked, setAuthChecked] = useState(() => !getAuthToken());

  const isLoggedIn = !!token;

  const persistAuth = useCallback((tokenVal, userData, refreshVal) => {
    setAuthToken(tokenVal);
    setToken(tokenVal);
    setUser(userData);
    // `undefined` means "leave it alone" — a profile update should not drop the
    // refresh token. `null` means "clear it", which is what logout passes.
    if (refreshVal !== undefined) setRefreshToken(refreshVal);
    if (userData) {
      localStorage.setItem('arteva_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('arteva_user');
    }
  }, []);

  /**
   * Drop every trace of the session, in storage and in React together.
   *
   * The two used to be able to diverge: the API client cleared localStorage on
   * a 401 while this context went on holding `token` in state. The app still
   * rendered as signed-in, every request went out without an Authorization
   * header, and the screen filled with "Not Authorized" until someone reloaded.
   */
  const clearSession = useCallback(() => {
    persistAuth(null, null, null);
    localStorage.removeItem('arteva_cart');
    localStorage.removeItem('arteva_promo');
  }, [persistAuth]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await AuthAPI.login(email, password);
      if (data.success && data.data.token) {
        persistAuth(data.data.token, data.data, data.data.refreshToken ?? null);
      }
      return data;
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  const register = useCallback(async (name, email, password, phone) => {
    setLoading(true);
    try {
      const data = await AuthAPI.register(name, email, password, phone);
      if (data.success && data.data.token) {
        persistAuth(data.data.token, data.data, data.data.refreshToken ?? null);
      }
      return data;
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  /**
   * Sign out here AND on the server.
   *
   * Clearing the browser's copy alone left the refresh token valid for another
   * month, so "log out" on a shared counter machine did not actually end the
   * session. Told to the server first, but never waited on for correctness —
   * the local state is cleared either way, because a logout that can fail is
   * worse than a redundant one.
   */
  const logout = useCallback(() => {
    const refresh = getRefreshToken();
    if (refresh) AuthAPI.logout(refresh).catch(() => {});
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    if (!token) { setAuthChecked(true); return null; }
    try {
      const data = await AuthAPI.getMe();
      if (data.success && data.data) {
        setUser(data.data);
        localStorage.setItem('arteva_user', JSON.stringify(data.data));
        return data.data;
      }
      return null;
    } catch (err) {
      /* Only a genuinely dead session clears state.
       *
       * This used to fire on any 401. The client now renews an expired access
       * token transparently and only reports failure when the refresh itself
       * could not be redeemed, so reaching here means the session really is
       * over — and `isSessionEnded` says so explicitly rather than being
       * inferred from a status code that means several different things.
       */
      if (err?.isSessionEnded) {
        clearSession();
      }
      return null;
    } finally {
      setAuthChecked(true);
    }
  }, [token, clearSession]);

  const updateProfile = useCallback(async (updates) => {
    const data = await AuthAPI.updateProfile(updates);
    if (data.success && data.data) {
      setUser(data.data);
      localStorage.setItem('arteva_user', JSON.stringify(data.data));
    }
    return data;
  }, []);

  // Verify token on mount
  useEffect(() => {
    if (token) refreshUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* The API client is where a dead session is discovered — it is the only
     code that sees the response. It announces it here so state and storage
     end the session in the same tick. */
  useEffect(() => {
    const onSessionEnded = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('arteva_user');
      setAuthChecked(true);
    };
    window.addEventListener(SESSION_ENDED_EVENT, onSessionEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onSessionEnded);
  }, []);

  /* Signing out in one tab signs out the others.
     `storage` only fires in the tabs that did NOT make the change, which is
     exactly the set that needs telling. */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'arteva_token') return;
      if (!e.newValue) {
        setToken(null);
        setUser(null);
      } else {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Auth sits above the whole tree, so an unstable value here re-renders every
  // page on any parent update.
  const value = useMemo(() => ({
    user, token, isLoggedIn, loading, authChecked,
    login, register, logout, refreshUser, updateProfile,
  }), [
    user, token, isLoggedIn, loading, authChecked,
    login, register, logout, refreshUser, updateProfile,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
