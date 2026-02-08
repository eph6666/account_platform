import { useState, useEffect } from 'react';
import { signIn, signOut, getCurrentUser } from 'aws-amplify/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

// 🚧 DEVELOPMENT MODE: Skip Cognito authentication
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV;

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_MODE); // Auto-auth in dev mode
  const [isLoading, setIsLoading] = useState(!DEV_MODE); // Skip loading in dev mode
  const queryClient = useQueryClient();

  // Check authentication status
  useEffect(() => {
    if (DEV_MODE) {
      // Development mode: skip Cognito auth
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    // Production mode: check Cognito auth
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Get current user info from backend
  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.auth.getMe(),
    enabled: false, // Manually fetch after authentication
    retry: 1,
  });

  // Sign in mutation (mocked in dev mode)
  const signInMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      if (DEV_MODE) {
        // Mock sign in for dev mode
        return { isSignedIn: true };
      }
      const result = await signIn({ username, password });
      return result;
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Sign out mutation (mocked in dev mode)
  const signOutMutation = useMutation({
    mutationFn: async () => {
      if (DEV_MODE) {
        // Mock sign out for dev mode
        return;
      }
      await signOut();
    },
    onSuccess: () => {
      if (!DEV_MODE) {
        setIsAuthenticated(false);
        queryClient.clear();
      }
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading,
    signIn: signInMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    refetchUser,
  };
};

export const useIsAdmin = () => {
  const { user } = useAuth();
  return user?.role === 'admin';
};
