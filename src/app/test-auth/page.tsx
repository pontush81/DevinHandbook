"use client";

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function TestAuthPage() {
  const { user, session, isLoading } = useAuth();
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [cookies, setCookies] = useState<string>('');
  const [localStorage, setLocalStorage] = useState<any>({});

  useEffect(() => {
    const checkAuth = async () => {
      // Check Supabase session directly
      const { data: { session }, error } = await supabase.auth.getSession();
      setSupabaseSession({ session, error });

      // Check cookies
      if (typeof document !== 'undefined') {
        setCookies(document.cookie);
      }

      // Check localStorage
      if (typeof window !== 'undefined') {
        try {
          const keys = Object.keys(window.localStorage).filter(k => 
            k.includes('supabase') || k.startsWith('sb-')
          );
          const storage: any = {};
          keys.forEach(key => {
            storage[key] = window.localStorage.getItem(key);
          });
          setLocalStorage(storage);
        } catch (e) {
          setLocalStorage({ error: 'localStorage not accessible' });
        }
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async () => {
    const email = prompt('Email:');
    const password = prompt('Password:');
    
    if (email && password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        alert('Login error: ' + error.message);
      } else {
        alert('Login successful!');
        window.location.reload();
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AuthContext Status */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">AuthContext Status</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>User:</strong> {user ? 'Yes' : 'No'}</p>
            <p><strong>Session:</strong> {session ? 'Yes' : 'No'}</p>
            {user && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
              </div>
            )}
          </div>
        </div>

        {/* Supabase Direct */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Supabase Direct</h2>
          <div className="space-y-2">
            <p><strong>Has Session:</strong> {supabaseSession?.session ? 'Yes' : 'No'}</p>
            <p><strong>Has User:</strong> {supabaseSession?.session?.user ? 'Yes' : 'No'}</p>
            {supabaseSession?.error && (
              <p className="text-red-600"><strong>Error:</strong> {supabaseSession.error.message}</p>
            )}
            {supabaseSession?.session?.user && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p><strong>Email:</strong> {supabaseSession.session.user.email}</p>
                <p><strong>ID:</strong> {supabaseSession.session.user.id}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cookies */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Cookies</h2>
          <div className="space-y-2">
            <p><strong>Has Auth Cookies:</strong> {cookies.includes('sb-') ? 'Yes' : 'No'}</p>
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs font-mono max-h-32 overflow-y-auto">
              {cookies || 'No cookies'}
            </div>
          </div>
        </div>

        {/* localStorage */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">localStorage</h2>
          <div className="space-y-2">
            <p><strong>Auth Keys:</strong> {Object.keys(localStorage).length}</p>
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs font-mono max-h-32 overflow-y-auto">
              <pre>{JSON.stringify(localStorage, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        {user ? (
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        ) : (
          <Button onClick={handleLogin}>
            Login
          </Button>
        )}
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload Page
        </Button>
      </div>
    </div>
  );
} 