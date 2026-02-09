// API Configuration
// Use empty string in both dev and production to leverage relative paths
// - Development: Vite proxy handles /api -> localhost:8000
// - Production: CloudFront proxy handles /api -> ALB
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
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
