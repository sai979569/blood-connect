import axios from 'axios';
import {
  API_BASE_URL,
  BACKEND_URL,
  HEALTH_CHECK_URL,
  SOCKET_URL,
  DEFAULT_PRODUCTION_BACKEND,
} from '../config/apiConfig.js';

export {
  API_BASE_URL,
  BACKEND_URL,
  HEALTH_CHECK_URL,
  SOCKET_URL,
  DEFAULT_PRODUCTION_BACKEND,
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000,
});

// Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('blood_connect_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      console.warn('[API] 401 received. Clearing auth token.');
      localStorage.removeItem('blood_connect_token');
      localStorage.removeItem('blood_connect_user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
