/* eslint-disable react-refresh/only-export-components -- this file intentionally
   exports the Provider component alongside its hook (useAuth), which is a
   standard React context pattern; splitting them would only hurt readability. */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api.js';
import { setAccessToken } from '../services/tokenStore.js';
import { disconnectSocket } from '../lib/socket.js';
import { ROLE_META } from '../constants/enums.js';

const AuthContext = createContext(null);

// Which top-level routes each role may reach. Enforced here for UX (hiding
// nav, redirecting) — the REAL enforcement lives server-side in
// backend/src/middleware/auth.js (requireRole/requireOwnHospital), since
// client-side gating alone can always be bypassed by calling the API directly.
const ROUTE_ACCESS = {
  admin:      ['/dashboard', '/beds', '/opd', '/doctors', '/inventory', '/admissions', '/city', '/audit'],
  doctor:     ['/dashboard', '/opd', '/doctors', '/admissions', '/city', '/audit'],
  staff:      ['/dashboard', '/beds', '/inventory', '/city', '/audit'],
  city_admin: ['/city', '/audit'],
};

const PUBLIC_PATHS = ['/login', '/signup', '/unauthorized'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Silent session hydration on load: exchange the httpOnly refresh cookie
  // for a fresh access token, so a page refresh doesn't log the user out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authService.refresh();
        if (cancelled) return;
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
      } catch {
        setAccessToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // If a background token refresh fails (refresh token expired/revoked),
  // api.js dispatches this event so we can drop the session everywhere.
  useEffect(() => {
    const onExpire = () => setUser(null);
    window.addEventListener('auth:expired', onExpire);
    return () => window.removeEventListener('auth:expired', onExpire);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await authService.login({ email, password });
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      return { ok: true, user: data.data.user };
    } catch (err) {
      return { ok: false, msg: err.response?.data?.message || 'Login failed. Please try again.' };
    }
  }, []);

  const signup = useCallback(async (payload) => {
    try {
      const { data } = await authService.register(payload);
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      return { ok: true, user: data.data.user };
    } catch (err) {
      return { ok: false, msg: err.response?.data?.message || 'Registration failed. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* best effort */ }
    setAccessToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  const homeFor = useCallback((role) => ROLE_META[role]?.home || '/dashboard', []);

  const canAccess = useCallback((pathname) => {
    if (!user) return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
    const allowed = ROUTE_ACCESS[user.role] || [];
    return allowed.some((route) => pathname.startsWith(route));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, homeFor, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
