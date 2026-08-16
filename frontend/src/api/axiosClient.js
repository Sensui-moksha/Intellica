/**
 * Axios Client — Hybrid Auth (Session Cookie + JWT Bearer)
 * ─────────────────────────────────────────────────────────────────────────────
 * Base URL: '/api'  →  Vite dev proxy routes to the backend automatically.
 *
 * Auth strategy:
 *   • withCredentials: true  →  browser automatically sends the httpOnly
 *     session cookie (intellica.sid) on every request.
 *   • Authorization: Bearer <token>  →  JWT is also sent for API/mobile
 *     clients and as a fallback when no session exists.
 *
 * The backend authMiddleware accepts EITHER the cookie OR the JWT.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,   // ← send httpOnly session cookie on every request
});

// ── Request interceptor — attach JWT if available (API/mobile compat) ────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle session/token expiry ───────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';

    // Routes that are expected to return 401 (not a session expiry)
    const isPublicAuthRoute =
      url.includes('/auth/login')          ||
      url.includes('/auth/check-user')     ||
      url.includes('/auth/verify-otp')     ||
      url.includes('/auth/forgot-password')||
      url.includes('/auth/verify-reset-otp')||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/faculty/register')||
      url.includes('/auth/hod/register');

    if (err.response?.status === 401 && !isPublicAuthRoute) {
      // Clear all local auth state
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('department');
      localStorage.removeItem('profileImage');
      localStorage.removeItem('designation');

      // Redirect to login (session + JWT both expired/invalid)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
