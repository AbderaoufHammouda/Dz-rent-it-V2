/**
 * DZ-RentIt — Axios Client
 * =========================
 *
 * Central HTTP client with JWT authentication interceptors.
 *
 * REQUEST INTERCEPTOR:
 *   Attaches the access token (Bearer) to every outgoing request.
 *
 * RESPONSE INTERCEPTOR:
 *   On 401 → attempt silent token refresh using the refresh token.
 *   If refresh succeeds → retry the original request automatically.
 *   If refresh fails → clear tokens and redirect to /login.
 *
 * Concurrent 401 handling:
 *   A queue ensures only ONE refresh request is made at a time;
 *   all other failed requests wait and retry once the new token arrives.
 */

import axios from 'axios';

export const ACCESS_KEY = 'dz_rentit_access';
export const REFRESH_KEY = 'dz_rentit_refresh';

const api = axios.create({
  baseURL: '/api',          // Vite proxy forwards /api → http://localhost:8000/api
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: silent refresh on 401 ─────────────────────────────
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh once per request, and not on the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login/')
    ) {
      if (isRefreshing) {
        // Another refresh is in progress → queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        return Promise.reject(error);
      }

      try {
        // Use raw axios (no interceptors) for the refresh call
        const { data } = await axios.post('/api/auth/login/refresh/', {
          refresh: refreshToken,
        });

        localStorage.setItem(ACCESS_KEY, data.access);
        // SimpleJWT ROTATE_REFRESH_TOKENS=True → new refresh token returned
        if (data.refresh) {
          localStorage.setItem(REFRESH_KEY, data.refresh);
        }

        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('dz_rentit_user');
}

export default api;
