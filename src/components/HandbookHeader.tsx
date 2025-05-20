import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const HandbookHeader: React.FC = () => {
  const { user, signOut, isLoading } = useAuth();
  const pathname = usePathname();

  // Döljer användarinfo på publika flows
  const isPublicFlow = pathname === '/create-handbook' || pathname?.includes('/create-handbook');

  if (isLoading) return null;

  return (
    <nav aria-label="Huvudmeny" className="flex justify-between items-center py-4 px-6 border-b bg-white">
      <div className="font-bold text-lg">Digital Handbok</div>
      <div>
        {user && !isPublicFlow ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">{user.email}</span>
            {user.app_metadata?.roles && (
              <span className="text-xs text-gray-500">({user.app_metadata.roles.join(', ')})</span>
            )}
            <button
              onClick={signOut}
              className="ml-2 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              aria-label="Logga ut"
              data-testid="logout-button"
            >
              Logga ut
            </button>
          </div>
        ) : !user && !isPublicFlow ? (
          <Link
            href="/login"
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
            aria-label="Logga in"
            data-testid="login-link"
            prefetch={true}
          >
            Logga in
          </Link>
        ) : null}
      </div>
    </nav>
  );
};

export default HandbookHeader; 