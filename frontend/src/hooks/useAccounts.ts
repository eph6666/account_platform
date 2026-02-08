import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import type {
  AccountCreateRequest,
  BillingAddressUpdate,
} from '../types';

// List all accounts
export const useAccounts = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.list(),
    enabled: isAuthenticated, // Only fetch when authenticated
    staleTime: 30000, // 30 seconds
    retry: false, // Don't retry on error to avoid loops
  });
};

// Get single account detail
export const useAccount = (accountId: string | undefined) => {
  return useQuery({
    queryKey: ['accounts', accountId],
    queryFn: () => api.accounts.get(accountId!),
    enabled: !!accountId,
    staleTime: 30000,
  });
};

// Create account mutation
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AccountCreateRequest) => api.accounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

// Export credentials mutation
export const useExportCredentials = (accountId: string) => {
  return useMutation({
    mutationFn: () => api.accounts.getCredentials(accountId),
  });
};

// Get billing address
export const useBillingAddress = (accountId: string | undefined) => {
  return useQuery({
    queryKey: ['accounts', accountId, 'billing'],
    queryFn: () => api.accounts.getBilling(accountId!),
    enabled: !!accountId,
    staleTime: 60000, // 1 minute
  });
};

// Update billing address mutation
export const useUpdateBilling = (accountId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BillingAddressUpdate) => api.accounts.updateBilling(accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'billing'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId] });
    },
  });
};

// Get Bedrock quota
export const useQuota = (accountId: string | undefined) => {
  return useQuery({
    queryKey: ['accounts', accountId, 'quota'],
    queryFn: () => api.accounts.getQuota(accountId!),
    enabled: !!accountId,
    staleTime: 60000, // 1 minute
  });
};

// Refresh quota mutation
export const useRefreshQuota = (accountId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.accounts.refreshQuota(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'quota'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId] });
    },
  });
};
