import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { QuotaConfig, QuotaConfigUpdate } from '../types/admin';

/**
 * Hook to fetch quota configuration
 */
export function useQuotaConfig() {
  return useQuery<QuotaConfig>({
    queryKey: ['quota-config'],
    queryFn: () => api.admin.getQuotaConfig(),
  });
}

/**
 * Hook to update quota configuration
 */
export function useUpdateQuotaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: QuotaConfigUpdate) => api.admin.updateQuotaConfig(update),
    onSuccess: () => {
      // Invalidate and refetch quota config
      queryClient.invalidateQueries({ queryKey: ['quota-config'] });
      // Also invalidate account lists since they display quota info
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
