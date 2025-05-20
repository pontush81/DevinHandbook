import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const HandbookHeader: React.FC = () => {
  const { user, signOut, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <header className="flex justify-between items-center py-4 px-6 border-b bg-white">
      <div className="font-bold text-lg">Digital Handbok</div>
      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">{user.email}</span>
            {user.app_metadata?.roles && (
              <span className="text-xs text-gray-500">({user.app_metadata.roles.join(', ')})</span>
            )}
            <button onClick={signOut} className="ml-2 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm">Logga ut</button>
          </div>
        ) : (
          <a href="/login" className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm">Logga in</a>
        )}
      </div>
    </header>
  );
};

export default HandbookHeader; 