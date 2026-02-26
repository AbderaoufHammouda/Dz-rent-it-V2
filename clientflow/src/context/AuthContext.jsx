/**
 * DZ-RentIt — Authentication Context
 * ====================================
 *
 * ARCHITECTURE DECISION:
 * Context API chosen over Zustand/Redux because:
 * 1. Auth state is a single concern — no complex middleware needed
 * 2. Provider pattern ensures auth is available everywhere
 * 3. Simpler to defend during soutenance
 * 4. No additional dependency
 *
 * Features:
 * - JWT dual-token storage (access + refresh) in localStorage
 * - Auto-login on app refresh (token validation via /auth/me/)
 * - Token expiration detection (standard JWT payload decode)
 * - Loading state for auth resolution
 * - Logout with cleanup
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../services/api.js';
import { ACCESS_KEY, REFRESH_KEY } from '../api/axios.js';

/** @type {React.Context<import('../types/index.js').AuthState & { login, register, logout, updateUser }>} */
const AuthContext = createContext(null);

const USER_KEY = 'dz_rentit_user';

/**
 * Check if a JWT token is expired.
 * Decodes the payload without a library — works for standard JWTs.
 */
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(ACCESS_KEY));
  const [loading, setLoading] = useState(true); // true until initial auth check completes

  // ── Auto-login on mount ──────────────────────────────────────────────────
  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem(ACCESS_KEY);

      if (!savedToken || isTokenExpired(savedToken)) {
        // No valid access token → clear and finish
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Try to validate token with backend
      try {
        const { user: freshUser } = await authAPI.me();
        setUser(freshUser);
        setToken(savedToken);
      } catch {
        // Token invalid on server side → clean up
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  // authAPI.login() already stores tokens in localStorage and returns {user, token}
  const login = useCallback(async (email, password) => {
    const { user: loggedInUser, token: accessToken } = await authAPI.login(email, password);

    setToken(accessToken);
    setUser(loggedInUser);

    return loggedInUser;
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────
  // authAPI.register() creates account then auto-logs in, returns {user, token}
  const register = useCallback(async (name, email, password) => {
    const { user: newUser, token: accessToken } = await authAPI.register(name, email, password);

    setToken(accessToken);
    setUser(newUser);

    return newUser;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // ── Update user profile (optimistic) ─────────────────────────────────────
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Memoized context value ───────────────────────────────────────────────
  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    register,
    logout,
    updateUser,
  }), [user, token, loading, login, register, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access auth state and actions.
 * Throws if used outside AuthProvider — fail-fast pattern.
 * 
 * @returns {{ user: User|null, token: string|null, isAuthenticated: boolean, loading: boolean, login: Function, register: Function, logout: Function, updateUser: Function }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
