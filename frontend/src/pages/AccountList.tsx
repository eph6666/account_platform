import { useState } from 'react';
import { useAccounts, useIsAdmin } from '../hooks';
import { AccountCard } from '../components/Account';
import { AccountForm } from '../components/Account';
import { Icon } from '../components/Icon';

export const AccountList = () => {
  const { data: accounts, isLoading, isError } = useAccounts();
  const isAdmin = useIsAdmin();
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Icon name="progress_activity" className="animate-spin" />
          <span>Loading accounts...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <Icon name="error" />
          <span>Failed to load accounts</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Icon name="cloud" size="lg" className="text-blue-600 dark:text-blue-400" />
            AWS Accounts
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Icon name="settings" size="sm" />
            Manage your AWS account credentials and quotas
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary"
          >
            <Icon name="add" size="sm" />
            Add Account
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Icon name="add_circle" className="text-blue-600 dark:text-blue-400" />
              Create New Account
            </h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="icon-button"
            >
              <Icon name="close" />
            </button>
          </div>
          <AccountForm
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {accounts && accounts.length === 0 ? (
        <div className="card text-center py-16">
          <Icon name="cloud_off" size="xl" className="text-gray-400 dark:text-gray-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">No accounts found</p>
          {isAdmin && (
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-3">
              Click "Add Account" to create your first account
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Icon name="inventory" size="sm" />
            <span>{accounts?.length} account{accounts && accounts.length !== 1 ? 's' : ''} found</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {accounts?.map((account) => (
              <AccountCard key={account.account_id} account={account} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
