/**
 * Centralized API & Backend URL Configuration for Blood Connect
 *
 * Provides a single source of truth for:
 * - Backend origin (BACKEND_URL)
 * - Versioned REST API base URL (API_BASE_URL)
 * - Health check endpoint URL (HEALTH_CHECK_URL)
 * - Real-time Socket.IO connection URL (SOCKET_URL)
 */

export const DEFAULT_PRODUCTION_BACKEND = 'https://blood-connect-2pmc.onrender.com';

/**
 * Returns true if the client is executing in a local development environment.
 */
export const isLocalhostEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
};

/**
 * Resolves the backend origin URL:
 * - Prioritizes import.meta.env.VITE_API_URL
 * - Automatically strips trailing slashes and redundant /api or /api/v1 suffixes
 * - In local development without VITE_API_URL: returns empty string (leveraging Vite proxy)
 * - In production without VITE_API_URL: safely falls back to DEFAULT_PRODUCTION_BACKEND
 */
export const getBackendBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '').replace(/\/api(\/v1)?$/i, '');
  }

  if (isLocalhostEnvironment()) {
    return '';
  }

  return DEFAULT_PRODUCTION_BACKEND;
};

export const BACKEND_URL = getBackendBaseUrl();

/**
 * Versioned REST API Base URL (/api/v1):
 * - In production: 'https://blood-connect-2pmc.onrender.com/api/v1'
 * - In local dev with Vite proxy: '/api/v1'
 */
export const API_BASE_URL = BACKEND_URL ? `${BACKEND_URL}/api/v1` : '/api/v1';

/**
 * Dedicated health check endpoint URL:
 * - In production: 'https://blood-connect-2pmc.onrender.com/api/v1/health'
 * - In local dev with Vite proxy: '/api/v1/health'
 */
export const HEALTH_CHECK_URL = BACKEND_URL ? `${BACKEND_URL}/api/v1/health` : '/api/v1/health';

/**
 * Socket.IO server connection URL:
 * - In production: 'https://blood-connect-2pmc.onrender.com'
 * - In local dev: window.location.origin (proxied by Vite) or 'http://localhost:5000'
 */
export const SOCKET_URL =
  BACKEND_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

export default {
  DEFAULT_PRODUCTION_BACKEND,
  BACKEND_URL,
  API_BASE_URL,
  HEALTH_CHECK_URL,
  SOCKET_URL,
  isLocalhostEnvironment,
  getBackendBaseUrl,
};
