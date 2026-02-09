import { useDashboard } from '../hooks';
import { StatsCard, QuotaList } from '../components/Dashboard';
import { Icon } from '../components/Icon';
import { formatTPM } from '../utils/format';

export const Home = () => {
  const { data: stats, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Icon name="progress_activity" className="animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <Icon name="error" />
          <span>Failed to load dashboard data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Icon name="dashboard" size="lg" className="text-blue-600 dark:text-blue-400" />
          Dashboard
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <Icon name="analytics" size="sm" />
          Overview of your AWS accounts and resources
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard
          title="Total Accounts"
          value={stats.total_accounts}
          iconName="domain"
          description="All managed accounts"
          gradient="from-blue-500 to-blue-600"
        />
        <StatsCard
          title="Active Accounts"
          value={stats.active_accounts}
          iconName="check_circle"
          description="Currently active"
          gradient="from-emerald-500 to-emerald-600"
        />
        {stats.model_quotas?.map((modelQuota) => (
          <StatsCard
            key={modelQuota.model_id}
            title={`${modelQuota.display_name} TPM`}
            value={formatTPM(modelQuota.total_tpm)}
            iconName={modelQuota.icon_name}
            description={modelQuota.display_name}
            gradient={modelQuota.gradient}
          />
        ))}
      </div>

      <QuotaList accounts={stats.accounts_with_quota} />
    </div>
  );
};
