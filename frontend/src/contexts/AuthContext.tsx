import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { signIn as amplifySignIn, signOut as amplifySignOut, getCurrentUser } from 'aws-amplify/auth';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

// Check if dev mode
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isSigningIn: boolean;
  isSigningOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_MODE);
  const [isLoading, setIsLoading] = useState(!DEV_MODE);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [user, setUser] = useState<any>(null);
  const queryClient = useQueryClient();

  // Check authentication status on mount
  useEffect(() => {
    if (DEV_MODE) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

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

  // Fetch user info when authenticated
  useEffect(() => {
    if (isAuthenticated && !DEV_MODE) {
      api.auth.getMe()
        .then(setUser)
        .catch((error) => {
          console.error('Failed to fetch user info:', error);
          // If we can't fetch user info, user is not really authenticated
          if (error.response?.status === 401) {
            setIsAuthenticated(false);
          }
        });
    }
  }, [isAuthenticated]);

  const signIn = async (username: string, password: string) => {
    setIsSigningIn(true);
    try {
      if (DEV_MODE) {
        setIsAuthenticated(true);
        return;
      }

      const result = await amplifySignIn({ username, password });

      if (result.isSignedIn) {
        // Wait for Amplify session to be fully established
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsAuthenticated(true);

        // Try to fetch user info
        try {
          const userData = await api.auth.getMe();
          setUser(userData);
        } catch (error: any) {
          console.error('Failed to fetch user info:', error.response?.status);
          // The useEffect will retry
        }
      } else {
        throw new Error('Sign in failed: ' + JSON.stringify(result.nextStep));
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      if (!DEV_MODE) {
        await amplifySignOut();
      }
      setIsAuthenticated(false);
      setUser(null);
      queryClient.clear();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        signIn,
        signOut,
        isSigningIn,
        isSigningOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useIsAdmin = () => {
  const { user } = useAuth();
  return user?.role === 'admin';
};
