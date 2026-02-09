import { useState, useEffect } from 'react';
import { Icon } from '../Icon';
import { useQuotaConfig, useUpdateQuotaConfig } from '../../hooks';
import type { ModelConfig } from '../../types/admin';

export const QuotaConfigForm = () => {
  const { data: config, isLoading, isError } = useQuotaConfig();
  const updateMutation = useUpdateQuotaConfig();

  const [models, setModels] = useState<ModelConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[QuotaConfigForm] Status:', { isLoading, isError, hasConfig: !!config });
    console.log('[QuotaConfigForm] Config data:', config);
    if (config?.models) {
      console.log('[QuotaConfigForm] Models count:', config.models.length);
      console.log('[QuotaConfigForm] Models:', config.models);
    }
  }, [config, isLoading, isError]);

  // Initialize models from config
  useEffect(() => {
    if (config?.models) {
      console.log('[QuotaConfigForm] Initializing models state');
      setModels(config.models);
      setHasChanges(false);
    }
  }, [config]);

  const handleToggleEnabled = (index: number) => {
    const newModels = [...models];
    newModels[index].enabled = !newModels[index].enabled;
    setModels(newModels);
    setHasChanges(true);
  };

  const handleToggleDashboard = (index: number) => {
    const newModels = [...models];
    const newValue = !newModels[index].show_in_dashboard;

    // Count how many models currently have show_in_dashboard enabled
    const currentCount = newModels.filter(m => m.show_in_dashboard).length;

    // If trying to enable and already have 2, don't allow
    if (newValue && currentCount >= 2) {
      alert('Maximum 2 models can be shown in dashboard');
      return;
    }

    newModels[index].show_in_dashboard = newValue;
    setModels(newModels);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate({ models });
    setHasChanges(false);
  };

  const handleReset = () => {
    if (config?.models) {
      setModels(config.models);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <Icon name="progress_activity" className="animate-spin mr-2" />
          Loading configuration...
        </div>
      </div>
    );
  }

  if (isError || !config) {
    return (
      <div className="card">
        <div className="flex flex-col items-center justify-center py-12 text-red-600 dark:text-red-400">
          <Icon name="error" size="lg" className="mb-3" />
          <p className="text-lg font-semibold">Failed to load configuration</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Form Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Model Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Enable or disable models to control quota monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="btn-secondary text-sm"
              disabled={updateMutation.isPending}
            >
              <Icon name="undo" size="sm" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            className="btn-primary text-sm"
            disabled={!hasChanges || updateMutation.isPending}
          >
            <Icon
              name={updateMutation.isPending ? 'progress_activity' : 'save'}
              size="sm"
              className={updateMutation.isPending ? 'animate-spin' : ''}
            />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {updateMutation.isSuccess && !hasChanges && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3 text-green-800 dark:text-green-200">
            <Icon name="check_circle" className="text-green-600 dark:text-green-400" />
            <span className="font-medium">Configuration saved successfully!</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {updateMutation.isError && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3 text-red-800 dark:text-red-200">
            <Icon name="error" className="text-red-600 dark:text-red-400" />
            <span className="font-medium">Failed to save configuration. Please try again.</span>
          </div>
        </div>
      )}

      {/* Models List */}
      <div className="space-y-4">
        {models.map((model, index) => (
          <div
            key={model.model_id}
            className={`p-5 rounded-lg border-2 transition-all ${
              model.enabled
                ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center h-6 mt-1">
                <button
                  onClick={() => handleToggleEnabled(index)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    model.enabled
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      model.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Model Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className={`text-lg font-semibold ${
                    model.enabled
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {model.display_name}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    model.enabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {model.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {model.show_in_dashboard && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                      <Icon name="dashboard" size="sm" className="inline mr-1" />
                      Dashboard
                    </span>
                  )}
                </div>

                {/* Show in Dashboard Checkbox */}
                <div className="flex items-center gap-2 mt-2 mb-3">
                  <input
                    type="checkbox"
                    id={`dashboard-${model.model_id}`}
                    checked={model.show_in_dashboard}
                    onChange={() => handleToggleDashboard(index)}
                    disabled={!model.enabled}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label
                    htmlFor={`dashboard-${model.model_id}`}
                    className={`text-sm ${
                      model.enabled
                        ? 'text-gray-700 dark:text-gray-300 cursor-pointer'
                        : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Show in Dashboard (max 2)
                  </label>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-mono">
                  {model.model_id}
                </p>

                {/* Quota Codes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-900/50 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Standard TPM QuotaCode
                    </div>
                    <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {model.quota_code_tpm}
                    </div>
                  </div>

                  {model.has_1m_context && model.quota_code_tpm_1m && (
                    <div className="bg-white dark:bg-gray-900/50 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        1M Context TPM QuotaCode
                      </div>
                      <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {model.quota_code_tpm_1m}
                      </div>
                    </div>
                  )}
                </div>

                {model.has_1m_context && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <Icon name="info" size="sm" />
                    <span>This model has a 1M context variant</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Icon name="info" size="sm" />
          <span>Last updated: {config.updated_at ? new Date(config.updated_at * 1000).toLocaleString() : 'N/A'}</span>
        </div>
        {config.updated_by && (
          <div className="flex items-center gap-2">
            <Icon name="person" size="sm" />
            <span>Updated by: {config.updated_by}</span>
          </div>
        )}
      </div>
    </div>
  );
};
