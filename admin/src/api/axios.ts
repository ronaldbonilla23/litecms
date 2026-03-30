import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Esto enviará el token automáticamente en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('[API Interceptor] Token:', token ? 'Presente (' + token.substring(0, 20) + '...)' : 'Ausente');
  console.log('[API Interceptor] Request:', config.method?.toUpperCase(), config.url);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
    console.log('[API Interceptor] Authorization header agregado');
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para manejar errores globales (como el 401 de sesión expirada)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;