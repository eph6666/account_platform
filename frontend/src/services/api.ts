import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import type {
  AWSAccount,
  AccountCreateRequest,
  CredentialsResponse,
  BillingAddress,
  BillingAddressUpdate,
  BedrockQuota,
  CognitoConfig,
  UserInfo,
  DashboardStats,
} from '../types';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Check if dev mode
const isDevMode = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth in development mode
    if (isDevMode) {
      return config;
    }

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // No session available - continue without token for public endpoints
      console.debug('No auth session available');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      if (status === 401) {
        // Unauthorized - just log, let AuthContext handle redirect
        console.error('Unauthorized - token expired or invalid');
        // Don't auto-redirect here - let the AuthContext handle it
      } else if (status === 403) {
        console.error('Forbidden - insufficient permissions');
      } else if (status === 404) {
        console.error('Resource not found');
      } else if (status >= 500) {
        console.error('Server error:', data?.detail || error.message);
      }
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server');
    } else {
      // Error in request setup
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// API Service methods
export const api = {
  // Health check
  health: async () => {
    const response = await apiClient.get(ENDPOINTS.HEALTH);
    return response.data;
  },

  // Auth endpoints
  auth: {
    getConfig: async (): Promise<CognitoConfig> => {
      const response = await apiClient.get<CognitoConfig>(ENDPOINTS.AUTH_CONFIG);
      return response.data;
    },

    getMe: async (): Promise<UserInfo> => {
      const response = await apiClient.get<UserInfo>(ENDPOINTS.AUTH_ME);
      return response.data;
    },
  },

  // Account endpoints
  accounts: {
    list: async (): Promise<AWSAccount[]> => {
      const response = await apiClient.get<AWSAccount[]>(ENDPOINTS.ACCOUNTS);
      return response.data;
    },

    create: async (data: AccountCreateRequest): Promise<AWSAccount> => {
      const response = await apiClient.post<AWSAccount>(ENDPOINTS.ACCOUNTS, data);
      return response.data;
    },

    get: async (accountId: string): Promise<AWSAccount> => {
      const response = await apiClient.get<AWSAccount>(ENDPOINTS.ACCOUNT_DETAIL(accountId));
      return response.data;
    },

    getCredentials: async (accountId: string): Promise<CredentialsResponse> => {
      const response = await apiClient.get<CredentialsResponse>(
        ENDPOINTS.ACCOUNT_CREDENTIALS(accountId)
      );
      return response.data;
    },

    getBilling: async (accountId: string): Promise<BillingAddress> => {
      const response = await apiClient.get<BillingAddress>(
        ENDPOINTS.ACCOUNT_BILLING(accountId)
      );
      return response.data;
    },

    updateBilling: async (
      accountId: string,
      data: BillingAddressUpdate
    ): Promise<BillingAddress> => {
      const response = await apiClient.put<BillingAddress>(
        ENDPOINTS.ACCOUNT_BILLING(accountId),
        data
      );
      return response.data;
    },

    getQuota: async (accountId: string): Promise<BedrockQuota> => {
      const response = await apiClient.get<BedrockQuota>(ENDPOINTS.ACCOUNT_QUOTA(accountId));
      return response.data;
    },

    refreshQuota: async (accountId: string): Promise<BedrockQuota> => {
      const response = await apiClient.post<BedrockQuota>(
        ENDPOINTS.ACCOUNT_QUOTA_REFRESH(accountId)
      );
      return response.data;
    },
  },

  // Dashboard endpoints
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      const response = await apiClient.get<DashboardStats>(ENDPOINTS.DASHBOARD_STATS);
      return response.data;
    },
  },
};

export default api;
