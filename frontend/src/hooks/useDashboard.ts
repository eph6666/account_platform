import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from './useAuth';

export const useDashboard = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.dashboard.getStats(),
    enabled: isAuthenticated, // Only fetch when authenticated
    staleTime: 30000, // 30 seconds
    refetchInterval: isAuthenticated ? 60000 : false, // Only refetch when authenticated
    retry: false, // Don't retry on error to avoid loops
  });
};
