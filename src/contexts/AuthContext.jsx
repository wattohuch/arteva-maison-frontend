import {
  createContext, useContext, useState, useCallback, useEffect, useMemo,
} from 'react';
import { AuthAPI } from '../api/auth';
import { setAuthToken, getAuthToken } from '../api/client';

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

  const persistAuth = useCallback((tokenVal, userData) => {
    setAuthToken(tokenVal);
    setToken(tokenVal);
    setUser(userData);
    if (userData) {
      localStorage.setItem('arteva_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('arteva_user');
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await AuthAPI.login(email, password);
      if (data.success && data.data.token) {
        persistAuth(data.data.token, data.data);
      }
      return data;
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  /** Sign in with a Meta access token obtained by the Facebook JS SDK. */
  const loginWithFacebook = useCallback(async (accessToken) => {
    setLoading(true);
    try {
      const data = await AuthAPI.facebookLogin(accessToken);
      if (data.success && data.data.token) {
        persistAuth(data.data.token, data.data);
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
        persistAuth(data.data.token, data.data);
      }
      return data;
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  const logout = useCallback(() => {
    persistAuth(null, null);
    localStorage.removeItem('arteva_cart');
    localStorage.removeItem('arteva_promo');
  }, [persistAuth]);

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
      // A rejected token means the cached user (and its role) is stale — drop it
      // rather than leaving a stale `role` in localStorage for guards to read.
      if (err?.status === 401) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('arteva_user');
      }
      return null;
    } finally {
      setAuthChecked(true);
    }
  }, [token]);

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

  // Auth sits above the whole tree, so an unstable value here re-renders every
  // page on any parent update.
  const value = useMemo(() => ({
    user, token, isLoggedIn, loading, authChecked,
    login, loginWithFacebook, register, logout, refreshUser, updateProfile,
  }), [
    user, token, isLoggedIn, loading, authChecked,
    login, loginWithFacebook, register, logout, refreshUser, updateProfile,
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
