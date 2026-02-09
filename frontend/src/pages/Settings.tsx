import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useIsAdmin } from '../hooks';

export const Settings = () => {
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
              Admin privileges required to access settings
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
          onClick={() => navigate('/dashboard')}
          className="icon-button"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Icon name="settings" className="text-purple-600 dark:text-purple-400 text-2xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage system configuration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quota Configuration Card */}
        <button
          onClick={() => navigate('/settings/quota-config')}
          className="card text-left hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="speed" className="text-blue-600 dark:text-blue-400 text-2xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Quota Configuration
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Configure which Claude models to display and monitor. Add or remove models, manage QuotaCodes, and control visibility.
              </p>
              <div className="flex items-center gap-2 mt-4 text-blue-600 dark:text-blue-400">
                <span className="text-sm font-medium">Configure models</span>
                <Icon name="arrow_forward" size="sm" className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </button>

        {/* Placeholder for future settings */}
        <div className="card opacity-50 cursor-not-allowed">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="construction" className="text-gray-400 text-2xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                More Settings
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Additional configuration options coming soon.
              </p>
              <div className="flex items-center gap-2 mt-4 text-gray-400">
                <span className="text-sm font-medium">Coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
