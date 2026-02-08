import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 lg:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
