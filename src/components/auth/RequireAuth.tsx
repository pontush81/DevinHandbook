'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export default function RequireAuth({ 
  children, 
  redirectTo,
  fallback 
}: RequireAuthProps) {
  const { user, session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const hasSession = !!session;
    console.log('RequireAuth: Auth state check', { isLoading, hasSession, user: !!user });
    if (!isLoading && (!hasSession || !user)) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const loginUrl = redirectTo || `/login?redirect=${encodeURIComponent(currentPath)}`;
      console.log('RequireAuth: Redirecting to login:', loginUrl);
      router.replace(loginUrl);
    }
  }, [isLoading, session, user, router, redirectTo]);

  // Show loading state while checking auth
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Kontrollerar inloggning...</span>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  const hasSession = !!session;
  if (!hasSession || !user) {
    console.log('RequireAuth: Not authenticated, showing fallback');
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Omdirigerar till inloggning...</span>
        </div>
      </div>
    );
  }

  // User is authenticated, render children
  console.log('RequireAuth: User authenticated, rendering children');
  return <>{children}</>;
} 