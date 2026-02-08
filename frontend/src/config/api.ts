// API Configuration
// In development, use empty string to leverage Vite proxy
// In production, use full URL
const isDevMode = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
export const API_BASE_URL = isDevMode ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
export const API_PREFIX = '/api';

export const ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // Auth
  AUTH_CONFIG: `${API_PREFIX}/auth/config`,
  AUTH_ME: `${API_PREFIX}/auth/me`,

  // Accounts
  ACCOUNTS: `${API_PREFIX}/accounts`,
  ACCOUNT_DETAIL: (id: string) => `${API_PREFIX}/accounts/${id}`,
  ACCOUNT_CREDENTIALS: (id: string) => `${API_PREFIX}/accounts/${id}/credentials`,
  ACCOUNT_BILLING: (id: string) => `${API_PREFIX}/accounts/${id}/billing`,
  ACCOUNT_QUOTA: (id: string) => `${API_PREFIX}/accounts/${id}/quota`,
  ACCOUNT_QUOTA_REFRESH: (id: string) => `${API_PREFIX}/accounts/${id}/quota/refresh`,

  // Dashboard
  DASHBOARD_STATS: `${API_PREFIX}/dashboard/stats`,
};
