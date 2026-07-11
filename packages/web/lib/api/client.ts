'use client';

/**
 * Axios API client with automatic token refresh and tenant context.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function getTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  return {
    access: localStorage.getItem('sky_access_token'),
    refresh: localStorage.getItem('sky_refresh_token'),
  };
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('sky_access_token', access);
  localStorage.setItem('sky_refresh_token', refresh);
}

function clearTokens() {
  localStorage.removeItem('sky_access_token');
  localStorage.removeItem('sky_refresh_token');
}

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { access } = getTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  for (const p of failedQueue) {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  }
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refresh } = getTokens();
      if (!refresh) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refresh,
        });
        const { access_token, refresh_token } = response.data as {
          access_token: string;
          refresh_token: string;
        };
        setTokens(access_token, refresh_token);
        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { api, setTokens, clearTokens, getTokens };
export default api;
