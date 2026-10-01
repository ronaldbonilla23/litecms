import axios from 'axios';
import { API_URL } from '../lib/urls';

const api = axios.create({
  baseURL: API_URL,
});

// Esto enviará el token automáticamente en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para manejar errores globales (como el 401 de sesión expirada)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // En /auth/login un 401 significa credenciales incorrectas, no sesión expirada
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      window.location.href = `${import.meta.env.BASE_URL}login`;
    }
    return Promise.reject(error);
  }
);

export default api;
