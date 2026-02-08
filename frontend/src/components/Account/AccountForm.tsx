import { useState } from 'react';
import { useCreateAccount } from '../../hooks';
import type { AccountCreateRequest } from '../../types';

interface AccountFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
];

export const AccountForm = ({ onSuccess, onCancel }: AccountFormProps) => {
  const [formData, setFormData] = useState<AccountCreateRequest>({
    account_name: '',
    access_key: '',
    secret_key: '',
    region: 'us-east-1',
  });

  const createAccountMutation = useCreateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    createAccountMutation.mutate(formData, {
      onSuccess: () => {
        setFormData({ account_name: '', access_key: '', secret_key: '', region: 'us-east-1' });
        onSuccess?.();
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="account_name" className="block text-sm font-medium mb-2">
          Account Name
        </label>
        <input
          type="text"
          id="account_name"
          name="account_name"
          value={formData.account_name}
          onChange={handleChange}
          required
          className="input-field"
          placeholder="Enter account name"
        />
      </div>

      <div>
        <label htmlFor="access_key" className="block text-sm font-medium mb-2">
          Access Key
        </label>
        <input
          type="text"
          id="access_key"
          name="access_key"
          value={formData.access_key}
          onChange={handleChange}
          required
          className="input-field font-mono"
          placeholder="AKIA..."
        />
      </div>

      <div>
        <label htmlFor="secret_key" className="block text-sm font-medium mb-2">
          Secret Key
        </label>
        <input
          type="password"
          id="secret_key"
          name="secret_key"
          value={formData.secret_key}
          onChange={handleChange}
          required
          className="input-field font-mono"
          placeholder="Enter secret key"
        />
      </div>

      <div>
        <label htmlFor="region" className="block text-sm font-medium mb-2">
          Region (for Bedrock Quota)
        </label>
        <select
          id="region"
          name="region"
          value={formData.region}
          onChange={handleChange}
          className="input-field"
        >
          {AWS_REGIONS.map((region) => (
            <option key={region.value} value={region.value}>
              {region.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          TPM quota will be fetched from this region
        </p>
      </div>

      {createAccountMutation.isError && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md text-sm">
          Failed to create account. Please check the credentials and try again.
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={createAccountMutation.isPending}
          className="btn-primary"
        >
          {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};
