import axios from 'axios';

export const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true
});

api.interceptors.request.use(config => {
  config.metadata = { startTime: new Date() };
  console.debug(`[API] Request -> ${config.method?.toUpperCase() || 'GET'} ${config.baseURL}${config.url}`);
  return config;
}, error => Promise.reject(error));

api.interceptors.response.use(response => {
  const { config } = response;
  if (config && config.metadata && config.metadata.startTime) {
    const duration = new Date() - config.metadata.startTime;
    console.debug(`[API] Response <- ${config.method?.toUpperCase() || ''} ${config.url} status:${response.status} time:${duration}ms`);
  }
  return response;
}, error => {
  const config = (error && error.config) || {};
  const duration = config && config.metadata && config.metadata.startTime ? (new Date() - config.metadata.startTime) : 'n/a';
  const isAuthMe401 = (config && config.url && config.url.includes('/auth/me')) && (error && error.response && error.response.status === 401);
  if (!isAuthMe401) {
    console.error(`[API] Error <- ${config.method?.toUpperCase() || 'UNKNOWN'} ${config.url || 'unknown'} code:${error.code || 'n/a'} message:${error.message} time:${duration}ms`, error.response || error);
  }
  return Promise.reject(error);
});

export default api;
