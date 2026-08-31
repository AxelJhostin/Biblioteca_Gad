import axios from 'axios';

export const apiOrigin = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const api = axios.create({ baseURL: apiOrigin ? `${apiOrigin}/api` : '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('biblioteca_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('biblioteca_token');
    localStorage.removeItem('biblioteca_user');
    if (location.pathname.startsWith('/panel')) location.assign('/personal/login');
  }
  return Promise.reject(error);
});

export function apiFileUrl(path) {
  return `${apiOrigin}${path}`;
}

export default api;

