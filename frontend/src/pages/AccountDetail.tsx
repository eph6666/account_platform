import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useQuota, useRefreshQuota, useIsAdmin } from '../hooks';
import { useQuotaConfig } from '../hooks/useQuotaConfig';
import { ExportCredentialsDialog } from '../components/Account';
import { Icon } from '../components/Icon';
import { formatTPM } from '../utils/format';

export const AccountDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const { data: account, isLoading, isError } = useAccount(id);
  const { data: quota, isLoading: quotaLoading } = useQuota(id);
  const { data: quotaConfig } = useQuotaConfig();
  const refreshQuotaMutation = useRefreshQuota(id!);

  const [showExportDialog, setShowExportDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Icon name="progress_activity" className="animate-spin" />
          <span>Loading account...</span>
        </div>
      </div>
    );
  }

  if (isError || !account) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <Icon name="error" />
          <span>Failed to load account details</span>
        </div>
      </div>
    );
  }

  const handleRefreshQuota = () => {
    refreshQuotaMutation.mutate();
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/accounts')}
          className="icon-button"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {account.account_name}
            </h1>
            <span className={account.status === 'active' ? 'badge-success' : 'badge-inactive'}>
              <Icon name={account.status === 'active' ? 'check_circle' : 'cancel'} size="sm" />
              {account.status}
            </span>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Icon name="tag" size="sm" />
            <span className="font-mono">{account.account_id}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Icon name="info" className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Basic Information
            </h2>
          </div>

          <dl className="space-y-4">
            <div className="flex items-start gap-3">
              <Icon name="badge" size="sm" className="text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Account ID</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-50 dark:bg-gray-900/50 px-3 py-1.5 rounded">
                  {account.account_id}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Icon name="mail" size="sm" className="text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {account.account_email || <span className="text-gray-400">N/A</span>}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Icon name="public" size="sm" className="text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Region</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {account.region || 'us-east-1'}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Icon name="schedule" size="sm" className="text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(account.created_at * 1000).toLocaleString()}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Icon name="update" size="sm" className="text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(account.updated_at * 1000).toLocaleString()}
                </dd>
              </div>
            </div>
          </dl>

          {isAdmin && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowExportDialog(true)}
                className="btn-primary w-full justify-center"
              >
                <Icon name="key" size="sm" />
                Export Credentials
              </button>
            </div>
          )}
        </div>

        {/* Bedrock Quota Card */}
        <div className="card">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Icon name="speed" className="text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Bedrock Quota
              </h2>
            </div>
            {isAdmin && (
              <button
                onClick={handleRefreshQuota}
                disabled={refreshQuotaMutation.isPending}
                className="btn-secondary text-sm"
              >
                <Icon
                  name="refresh"
                  size="sm"
                  className={refreshQuotaMutation.isPending ? 'animate-spin' : ''}
                />
                {refreshQuotaMutation.isPending ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>

          {quotaLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <Icon name="progress_activity" className="animate-spin mr-2" />
              Loading quota...
            </div>
          ) : quota ? (
            <div className="space-y-4">
              {quotaConfig?.models?.filter(m => m.enabled).map((model, index) => {
                // Generate field name from model_id: claude-sonnet-4.5-v1 -> claude_sonnet_4_5_v1_tpm
                const fieldName = model.model_id.replace(/-/g, '_').replace(/\./g, '_') + '_tpm';
                const fieldName1m = model.model_id.replace(/-/g, '_').replace(/\./g, '_') + '_1m_tpm';
                const quotaValue = (quota as any)[fieldName] ?? 0;
                const quotaValue1m = model.has_1m_context ? ((quota as any)[fieldName1m] ?? 0) : null;

                // Determine card color based on index
                const colors = [
                  { bg: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', value: 'text-blue-600 dark:text-blue-400' },
                  { bg: 'from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', value: 'text-indigo-600 dark:text-indigo-400' },
                  { bg: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', value: 'text-purple-600 dark:text-purple-400' },
                  { bg: 'from-pink-50 to-pink-100/50 dark:from-pink-900/20 dark:to-pink-800/10', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', value: 'text-pink-600 dark:text-pink-400' },
                ];
                const color = colors[index % colors.length];

                return (
                  <div key={model.model_id}>
                    <div className={`p-4 bg-gradient-to-br ${color.bg} rounded-lg border ${color.border}`}>
                      <dt className={`text-sm font-medium ${color.text} flex items-center gap-2 mb-2`}>
                        <Icon name="psychology" size="sm" />
                        {model.display_name}
                      </dt>
                      <dd className={`text-3xl font-bold ${color.value}`}>
                        {formatTPM(quotaValue)}
                      </dd>
                    </div>
                    {quotaValue1m !== null && (
                      <div className={`p-4 bg-gradient-to-br ${color.bg} rounded-lg border ${color.border} mt-2`}>
                        <dt className={`text-sm font-medium ${color.text} flex items-center gap-2 mb-2`}>
                          <Icon name="psychology" size="sm" />
                          {model.display_name} (1M Context)
                        </dt>
                        <dd className={`text-3xl font-bold ${color.value}`}>
                          {formatTPM(quotaValue1m)}
                        </dd>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Icon name="history" size="sm" />
                Last updated: {quota.last_updated ? new Date(quota.last_updated * 1000).toLocaleString() : 'N/A'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <Icon name="error_outline" size="lg" className="mb-3" />
              <p>No quota information available</p>
            </div>
          )}
        </div>

        {/* Billing Address Card */}
        {account.billing_address && (
          <div className="card lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Icon name="location_on" className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Billing Address
              </h2>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Country</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {account.billing_address.country || <span className="text-gray-400">-</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">State</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {account.billing_address.state || <span className="text-gray-400">-</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">City</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {account.billing_address.city || <span className="text-gray-400">-</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Postal Code</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {account.billing_address.postal_code || <span className="text-gray-400">-</span>}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Address</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {account.billing_address.address || <span className="text-gray-400">-</span>}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {showExportDialog && (
        <ExportCredentialsDialog
          accountId={account.account_id}
          accountName={account.account_name}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
};
