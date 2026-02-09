import { useAuth } from '../../hooks';

export const Header = () => {
  const { user, signOut, isSigningOut } = useAuth();

  return (
    <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              AWS Account Platform
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {user.username}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {user.role === 'admin' ? 'Administrator' : 'User'}
                  </p>
                </div>
                <button
                  onClick={() => signOut()}
                  disabled={isSigningOut}
                  className="btn-secondary text-sm"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
