import { Link } from 'react-router-dom';
import { Icon } from '../Icon';
import type { AWSAccount } from '../../types';
import { formatTPM } from '../../utils/format';

interface AccountCardProps {
  account: AWSAccount;
}

export const AccountCard = ({ account }: AccountCardProps) => {
  const sonnetV1Tpm = account.bedrock_quota?.claude_sonnet_45_v1_tpm || 0;
  const sonnetV1_1mTpm = account.bedrock_quota?.claude_sonnet_45_v1_1m_tpm || 0;
  const opusTpm = account.bedrock_quota?.claude_opus_45_tpm || 0;
  // Total sonnet TPM for display
  const totalSonnetTpm = sonnetV1Tpm + sonnetV1_1mTpm;
  const hasQuota = totalSonnetTpm > 0 || opusTpm > 0;

  return (
    <Link
      to={`/accounts/${account.account_id}`}
      className="card-interactive group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {account.account_name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-mono flex items-center gap-1.5">
            <Icon name="tag" size="sm" />
            {account.account_id}
          </p>
        </div>
        <span className={account.status === 'active' ? 'badge-success' : 'badge-inactive'}>
          <Icon name={account.status === 'active' ? 'check_circle' : 'cancel'} size="sm" />
          {account.status}
        </span>
      </div>

      {account.billing_address && (account.billing_address.city || account.billing_address.country) && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Icon name="location_on" size="sm" />
          <span>
            {[account.billing_address.city, account.billing_address.country]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>
      )}

      {hasQuota && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {totalSonnetTpm > 0 && (
            <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Icon name="psychology" size="sm" className="text-blue-600 dark:text-blue-400" />
                Sonnet 4.5 Total
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatTPM(totalSonnetTpm)}
              </span>
            </div>
          )}
          {opusTpm > 0 && (
            <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Icon name="auto_awesome" size="sm" className="text-purple-600 dark:text-purple-400" />
                Opus 4.5
              </span>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatTPM(opusTpm)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <Icon name="schedule" size="sm" />
          {new Date(account.created_at * 1000).toLocaleDateString()}
        </span>
        <Icon name="arrow_forward" size="sm" className="group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
};
