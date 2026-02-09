import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureAmplify } from './config/amplify';
import { api } from './services/api';
import { AuthProvider } from './contexts';
import { MainLayout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { Login, Home, AccountList, AccountDetail, Settings, QuotaConfig } from './pages';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false, // Disable retry to prevent infinite loops
      staleTime: 30000,
    },
  },
});

function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    // Fetch Cognito configuration and initialize Amplify
    const initializeApp = async () => {
      if (isInitializing || isConfigured || configError) {
        return; // Prevent multiple initializations
      }

      setIsInitializing(true);
      try {
        const config = await api.auth.getConfig();
        configureAmplify(config.user_pool_id, config.client_id, config.region);
        setIsConfigured(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setConfigError('Failed to load authentication configuration');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []); // Empty dependency array - only run once on mount

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Configuration Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{configError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-lg text-gray-600 dark:text-gray-400">
          Initializing application...
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }>
              <Route index element={<Home />} />
              <Route path="accounts" element={<AccountList />} />
              <Route path="accounts/:id" element={<AccountDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/quota-config" element={<QuotaConfig />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
