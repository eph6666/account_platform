import { Link } from 'react-router-dom';
import type { QuotaSummary } from '../../types';
import { formatTPM } from '../../utils/format';

interface QuotaListProps {
  accounts: QuotaSummary[];
}

export const QuotaList = ({ accounts }: QuotaListProps) => {
  if (accounts.length === 0) {
    return (
      <div className="card text-center text-gray-500 dark:text-gray-400">
        No accounts with quota information available.
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Bedrock TPM Quota by Account
      </h3>
      <div className="space-y-3">
        {accounts.map((account) => (
          <Link
            key={account.account_id}
            to={`/accounts/${account.account_id}`}
            className="block p-4 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {account.account_name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {account.account_id}
                </p>
              </div>
              <div className="text-right space-y-1">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Sonnet 4.5 V1</p>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {formatTPM(account.claude_sonnet_45_v1_tpm)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Sonnet 4.5 V1 (1M)</p>
                  <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatTPM(account.claude_sonnet_45_v1_1m_tpm)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Opus 4.5</p>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {formatTPM(account.claude_opus_45_tpm)}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
