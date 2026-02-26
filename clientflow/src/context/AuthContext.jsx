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
 * - JWT token storage in localStorage
 * - Auto-login on app refresh (token validation)
 * - Token expiration detection
 * - Loading state for auth resolution
 * - Logout with cleanup
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../services/api.js';

/** @type {React.Context<import('../types/index.js').AuthState & { login, register, logout, updateUser }>} */
const AuthContext = createContext(null);

const TOKEN_KEY = 'dz_rentit_token';
const USER_KEY = 'dz_rentit_user';

/**
 * Check if a JWT token is expired.
 * Decodes the payload without a library — works for standard JWTs.
 * Falls back to false for mock tokens.
 */
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    // Mock tokens don't have JWT structure — treat as valid
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true); // true until initial auth check completes

  // ── Auto-login on mount ──────────────────────────────────────────────────
  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (!savedToken || isTokenExpired(savedToken)) {
        // No valid token → clear and finish
        localStorage.removeItem(TOKEN_KEY);
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
      } catch (error) {
        // Token invalid on server side → clean up
        localStorage.removeItem(TOKEN_KEY);
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
  const login = useCallback(async (email, password) => {
    const { user: loggedInUser, token: newToken } = await authAPI.login(email, password);
    
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setToken(newToken);
    setUser(loggedInUser);
    
    return loggedInUser;
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(async (name, email, password) => {
    const { user: newUser, token: newToken } = await authAPI.register(name, email, password);
    
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    
    return newUser;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
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
