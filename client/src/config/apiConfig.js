
/**
 * Centralized API configuration for Blood Connect.
 * Uses the confirmed production backend directly.
 */

export const DEFAULT_PRODUCTION_BACKEND =
  'https://blood-connect-2pmc.onrender.com';

export const isLocalhostEnvironment = () => {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  );
};

export const BACKEND_URL = isLocalhostEnvironment()
  ? ''
  : DEFAULT_PRODUCTION_BACKEND;

export const API_BASE_URL = `${BACKEND_URL}/api/v1`;

export const HEALTH_CHECK_URL = `${API_BASE_URL}/health`;

export const SOCKET_URL =
  BACKEND_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:5000');

export const getBackendBaseUrl = () => BACKEND_URL;

export default {
  DEFAULT_PRODUCTION_BACKEND,
  BACKEND_URL,
  API_BASE_URL,
  HEALTH_CHECK_URL,
  SOCKET_URL,
  isLocalhostEnvironment,
  getBackendBaseUrl,
};
