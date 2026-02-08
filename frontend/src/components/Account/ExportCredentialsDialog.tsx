import { useState } from 'react';
import { useExportCredentials } from '../../hooks';
import type { CredentialsResponse } from '../../types';

interface ExportCredentialsDialogProps {
  accountId: string;
  accountName: string;
  onClose: () => void;
}

export const ExportCredentialsDialog = ({
  accountId,
  accountName,
  onClose,
}: ExportCredentialsDialogProps) => {
  const [credentials, setCredentials] = useState<CredentialsResponse | null>(null);
  const [copied, setCopied] = useState<'ak' | 'sk' | null>(null);

  const exportMutation = useExportCredentials(accountId);

  const handleExport = () => {
    exportMutation.mutate(undefined, {
      onSuccess: (data) => {
        setCredentials(data);
      },
    });
  };

  const handleCopy = async (text: string, type: 'ak' | 'sk') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Export Credentials
        </h2>

        {!credentials ? (
          <>
            <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded-md p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>⚠️ Warning:</strong> Credentials will only be displayed once. Make sure
                to copy them before closing this dialog.
              </p>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              You are about to export credentials for account:{' '}
              <strong>{accountName}</strong> ({accountId})
            </p>

            {exportMutation.isError && (
              <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md text-sm mb-4">
                Failed to export credentials. You may not have permission.
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="btn-primary"
              >
                {exportMutation.isPending ? 'Exporting...' : 'Export Credentials'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Access Key</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={credentials.access_key}
                    readOnly
                    className="input-field font-mono text-sm flex-1"
                  />
                  <button
                    onClick={() => handleCopy(credentials.access_key, 'ak')}
                    className="btn-secondary px-3"
                  >
                    {copied === 'ak' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Secret Key</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={credentials.secret_key}
                    readOnly
                    className="input-field font-mono text-sm flex-1"
                  />
                  <button
                    onClick={() => handleCopy(credentials.secret_key, 'sk')}
                    className="btn-secondary px-3"
                  >
                    {copied === 'sk' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-100 dark:bg-blue-900 border border-blue-400 dark:border-blue-700 rounded-md p-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 Make sure to save these credentials securely. They will not be shown again.
              </p>
            </div>

            <div className="flex justify-end">
              <button onClick={onClose} className="btn-primary">
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
