"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bug, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { supabase, syncCookiesToLocalStorage } from '@/lib/supabase';

export function AuthDebugButton() {
  const { user, session, isLoading, refreshAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string } | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [shouldShow, setShouldShow] = useState(false);

  // Kontrollera om debug-knappen ska visas efter hydration
  useEffect(() => {
    const checkShouldShow = () => {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const hasAuthProblems = !user && typeof window !== 'undefined' && 
                             document.cookie.includes('sb-');
      setShouldShow(isDevelopment || hasAuthProblems);
    };
    
    checkShouldShow();
  }, [user]);

  // Samla debug-information
  useEffect(() => {
    if (isOpen) {
      const collectDebugInfo = async () => {
        const info: any = {
          timestamp: new Date().toISOString(),
          authContext: {
            user: !!user,
            session: !!session,
            isLoading,
            userEmail: user?.email,
            userId: user?.id
          },
          cookies: {
            all: typeof document !== 'undefined' ? document.cookie : 'N/A',
            authCookies: typeof document !== 'undefined' ? 
              document.cookie.split(';').filter(c => c.trim().startsWith('sb-')).map(c => c.trim()) : []
          },
          localStorage: {
            accessible: false,
            keys: []
          },
          supabaseSession: null
        };

        // Test localStorage
        try {
          if (typeof window !== 'undefined') {
            // Safe test without throwing errors
            const testKey = '__debug_test__';
            window.localStorage.setItem(testKey, 'test');
            window.localStorage.removeItem(testKey);
            info.localStorage.accessible = true;
            info.localStorage.keys = Object.keys(window.localStorage).filter(k => 
              k.includes('supabase') || k.startsWith('sb-')
            );
          }
        } catch (e) {
          info.localStorage.accessible = false;
        }

        // Test Supabase session
        try {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          info.supabaseSession = {
            hasSession: !!currentSession,
            hasUser: !!currentSession?.user,
            error: error?.message,
            userId: currentSession?.user?.id,
            email: currentSession?.user?.email,
            expiresAt: currentSession?.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : null
          };
        } catch (e) {
          info.supabaseSession = { error: e.message };
        }

        setDebugInfo(info);
      };

      collectDebugInfo();
    }
  }, [isOpen, user, session, isLoading]);

  if (!shouldShow) return null;

  const handleQuickFix = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      // Kontrollera om det är ett synkproblem mellan Supabase och AuthContext
      if (debugInfo?.supabaseSession?.hasSession && debugInfo?.supabaseSession?.hasUser && (!user || !session)) {
        console.log('🔄 Detected sync problem between Supabase session and AuthContext, forcing refresh...');
      }
      
      // Försök först synkronisera cookies
      try {
        syncCookiesToLocalStorage();
        console.log('Cookies synced to localStorage');
      } catch (syncError) {
        console.warn('Cookie sync failed:', syncError);
      }
      
      // Sedan försök refresha auth
      console.log('🔄 Calling refreshAuth to sync AuthContext with Supabase...');
      const result = await refreshAuth();
      setFixResult(result);
      
      if (result.success) {
        // Uppdatera debug info för att reflektera nya state
        setTimeout(() => {
          setIsOpen(false);
          setFixResult(null);
        }, 2000);
      }
    } catch (error) {
      setFixResult({
        success: false,
        message: 'Ett oväntat fel uppstod'
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getAuthStatus = () => {
    // Om Supabase har en session men AuthContext inte - visa varning istället för loading
    if (debugInfo?.supabaseSession?.hasSession && debugInfo?.supabaseSession?.hasUser && (!user || !session)) {
      return { status: 'warning', color: 'orange', text: 'Synkproblem' };
    }
    
    if (isLoading) return { status: 'loading', color: 'yellow', text: 'Laddar...' };
    if (user && session) return { status: 'ok', color: 'green', text: 'Inloggad' };
    if (!user && !session) return { status: 'error', color: 'red', text: 'Ej inloggad' };
    return { status: 'warning', color: 'orange', text: 'Problem' };
  };

  const authStatus = getAuthStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`
              shadow-lg border-2 transition-all duration-200
              ${authStatus.status === 'ok' ? 'border-green-500 bg-green-50 hover:bg-green-100' : ''}
              ${authStatus.status === 'error' ? 'border-red-500 bg-red-50 hover:bg-red-100' : ''}
              ${authStatus.status === 'warning' ? 'border-orange-500 bg-orange-50 hover:bg-orange-100' : ''}
              ${authStatus.status === 'loading' ? 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100' : ''}
            `}
          >
            <Bug className="w-4 h-4 mr-2" />
            Auth Debug
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Autentiserings-debug
            </DialogTitle>
            <DialogDescription>
              Detaljerad diagnostik av autentiseringsstatus
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Status översikt */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={authStatus.status === 'ok' ? 'default' : 'destructive'}>
                  {authStatus.text}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Laddar:</span>
                <Badge variant={isLoading ? 'destructive' : 'default'}>
                  {isLoading ? 'Ja' : 'Nej'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Användare:</span>
                <Badge variant={user ? 'default' : 'destructive'}>
                  {user ? 'Ja' : 'Nej'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Session:</span>
                <Badge variant={session ? 'default' : 'destructive'}>
                  {session ? 'Ja' : 'Nej'}
                </Badge>
              </div>
            </div>

            {user && (
              <div className="p-3 bg-gray-50 rounded text-sm">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id?.slice(0, 8)}...</p>
              </div>
            )}

            {/* Detaljerad debug-information */}
            {debugInfo && (
              <div className="space-y-4">
                <h3 className="font-semibold">Detaljerad information:</h3>
                
                {/* Cookies */}
                <div className="p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Cookies:</h4>
                  <div className="text-xs space-y-1">
                    <p><strong>Auth cookies:</strong> {debugInfo.cookies.authCookies.length}</p>
                    {debugInfo.cookies.authCookies.map((cookie: string, i: number) => (
                      <p key={i} className="font-mono">{cookie}</p>
                    ))}
                  </div>
                </div>

                {/* Supabase Session */}
                <div className="p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Supabase Session:</h4>
                  <div className="text-xs space-y-1">
                    <p><strong>Har session:</strong> {debugInfo.supabaseSession?.hasSession ? 'Ja' : 'Nej'}</p>
                    <p><strong>Har användare:</strong> {debugInfo.supabaseSession?.hasUser ? 'Ja' : 'Nej'}</p>
                    {debugInfo.supabaseSession?.email && (
                      <p><strong>Email:</strong> {debugInfo.supabaseSession.email}</p>
                    )}
                    {debugInfo.supabaseSession?.expiresAt && (
                      <p><strong>Går ut:</strong> {debugInfo.supabaseSession.expiresAt}</p>
                    )}
                    {debugInfo.supabaseSession?.error && (
                      <p className="text-red-600"><strong>Fel:</strong> {debugInfo.supabaseSession.error}</p>
                    )}
                  </div>
                </div>

                {/* localStorage */}
                <div className="p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">localStorage:</h4>
                  <div className="text-xs space-y-1">
                    <p><strong>Tillgänglig:</strong> {debugInfo.localStorage.accessible ? 'Ja' : 'Nej'}</p>
                    <p><strong>Auth-nycklar:</strong> {debugInfo.localStorage.keys.length}</p>
                    {debugInfo.localStorage.keys.map((key: string, i: number) => (
                      <p key={i} className="font-mono">{key}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Varning för synkproblem */}
            {debugInfo?.supabaseSession?.hasSession && debugInfo?.supabaseSession?.hasUser && (!user || !session) && (
              <div className="p-3 bg-orange-100 border border-orange-300 rounded">
                <div className="flex items-center gap-2 text-orange-700">
                  <span className="text-sm font-medium">⚠️ Synkproblem upptäckt</span>
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  Supabase har en giltig session men AuthContext är inte synkroniserad. 
                  Klicka på "Försök åtgärda" för att lösa detta.
                </p>
              </div>
            )}

            {/* Åtgärder */}
            <div className="flex gap-2">
              <Button
                onClick={handleQuickFix}
                disabled={isFixing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isFixing ? 'animate-spin' : ''}`} />
                {isFixing ? 'Åtgärdar...' : 'Försök åtgärda'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Ladda om sida
              </Button>
            </div>

            {fixResult && (
              <div className={`p-3 rounded ${
                fixResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className="flex items-center gap-2">
                  {fixResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{fixResult.message}</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 