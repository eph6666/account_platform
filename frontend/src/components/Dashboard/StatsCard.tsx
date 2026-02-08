import { Icon } from '../Icon';

interface StatsCardProps {
  title: string;
  value: number | string;
  iconName: string;
  description?: string;
  gradient?: string;
}

export const StatsCard = ({
  title,
  value,
  iconName,
  description,
  gradient = 'from-blue-500 to-indigo-600',
}: StatsCardProps) => {
  return (
    <div className="card group hover:shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">{title}</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 break-words">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Icon name="info" size="sm" />
              {description}
            </p>
          )}
        </div>
        <div className={`flex-shrink-0 w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
          <Icon name={iconName} size="lg" className="text-white" />
        </div>
      </div>
    </div>
  );
};
