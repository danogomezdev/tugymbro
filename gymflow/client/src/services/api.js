import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({ baseURL: `${BASE_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tgb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const token = localStorage.getItem('tgb_token');
      // Solo redirigir si había un token (sesión expirada), no si está intentando loguear
      if (token) {
        localStorage.removeItem('tgb_token');
        localStorage.removeItem('tgb_usuario');
        localStorage.removeItem('tgb_gimnasio');
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export const superApi = axios.create({ baseURL: `${BASE_URL}/api/superadmin` });
superApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('tgb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
