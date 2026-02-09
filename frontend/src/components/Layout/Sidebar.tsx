import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../Icon';
import { useIsAdmin } from '../../hooks';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: 'dashboard' },
  { name: 'Accounts', path: '/accounts', icon: 'domain' },
  { name: 'Settings', path: '/settings', icon: 'settings', adminOnly: true },
];

export const Sidebar = () => {
  const location = useLocation();
  const isAdmin = useIsAdmin();

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path ||
                             (item.path === '/settings' && location.pathname.startsWith('/settings'));
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon name={item.icon} className="mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
