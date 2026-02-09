import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useIsAdmin } from '../hooks';
import { QuotaConfigForm } from '../components/Admin/QuotaConfigForm';

export const QuotaConfig = () => {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  // Redirect non-admin users
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-red-600 dark:text-red-400">
          <Icon name="block" size="lg" />
          <div className="text-center">
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Admin privileges required to manage quota configuration
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary mt-4"
          >
            <Icon name="arrow_back" size="sm" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/settings')}
          className="icon-button"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Icon name="speed" className="text-blue-600 dark:text-blue-400 text-2xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                Quota Configuration
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure which Claude models to display and monitor
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Icon name="info" className="text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              About Quota Configuration
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Enable or disable models to control which quotas are queried and displayed across the platform.
              Only enabled models will appear in account details and dashboard statistics.
              Changes take effect immediately after saving.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <QuotaConfigForm />
    </div>
  );
};
