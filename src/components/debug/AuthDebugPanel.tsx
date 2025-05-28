"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { runAuthDiagnostics, logAuthDiagnostics, fixAuthIssues, type AuthDiagnostics } from '@/lib/auth-diagnostics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bug, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function AuthDebugPanel() {
  const { user, session, isLoading, refreshAuth } = useAuth();
  const [diagnostics, setDiagnostics] = useState<AuthDiagnostics | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string } | null>(null);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const result = await runAuthDiagnostics();
      setDiagnostics(result);
      logAuthDiagnostics(result);
    } catch (error) {
      console.error('Fel vid körning av diagnostik:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleFixAuth = async () => {
    setIsFixing(true);
    setFixResult(null);
    try {
      // Använd först den inbyggda refreshAuth-funktionen från AuthContext
      const authResult = await refreshAuth();
      
      if (authResult.success) {
        setFixResult(authResult);
      } else {
        // Om AuthContext-metoden misslyckas, försök med den generiska fix-funktionen
        const fallbackResult = await fixAuthIssues();
        setFixResult(fallbackResult);
      }
      
      // Kör diagnostik igen efter fix-försök
      setTimeout(() => {
        runDiagnostics();
      }, 1000);
    } catch (error) {
      console.error('Fel vid försök att fixa autentisering:', error);
      setFixResult({
        success: false,
        message: 'Ett oväntat fel uppstod.'
      });
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    // Kör diagnostik automatiskt när komponenten laddas
    runDiagnostics();
  }, []);

  const getStatusIcon = (hasValue: boolean, isError?: boolean) => {
    if (isError) return <XCircle className="h-4 w-4 text-red-500" />;
    if (hasValue) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (hasValue: boolean, isError?: boolean) => {
    if (isError) return <Badge variant="destructive">Fel</Badge>;
    if (hasValue) return <Badge variant="default" className="bg-green-500">OK</Badge>;
    return <Badge variant="destructive">Saknas</Badge>;
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="h-6 w-6" />
            Autentiserings-diagnostik
          </h2>
          <p className="text-gray-600 mt-1">
            Diagnostisera och åtgärda autentiseringsproblem
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunningDiagnostics}
            variant="outline"
          >
            {isRunningDiagnostics ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Kör diagnostik
          </Button>
          <Button 
            onClick={handleFixAuth} 
            disabled={isFixing}
            variant="default"
          >
            {isFixing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Försök fixa
          </Button>
        </div>
      </div>

      {fixResult && (
        <Card className={fixResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {fixResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={fixResult.success ? "text-green-700" : "text-red-700"}>
                {fixResult.message}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth Context Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Auth Context Status
              {getStatusIcon(!isLoading && !!user)}
            </CardTitle>
            <CardDescription>
              Status från AuthContext
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Laddar:</span>
              {getStatusBadge(!isLoading)}
            </div>
            <div className="flex justify-between items-center">
              <span>Har användare:</span>
              {getStatusBadge(!!user)}
            </div>
            <div className="flex justify-between items-center">
              <span>Har session:</span>
              {getStatusBadge(!!session)}
            </div>
            {user && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm"><strong>Email:</strong> {user.email}</p>
                <p className="text-sm"><strong>ID:</strong> {user.id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supabase Session */}
        {diagnostics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Supabase Session
                {getStatusIcon(
                  diagnostics.supabaseSession.hasSession,
                  !!diagnostics.supabaseSession.error
                )}
              </CardTitle>
              <CardDescription>
                Direkt från Supabase-klienten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Har session:</span>
                {getStatusBadge(diagnostics.supabaseSession.hasSession)}
              </div>
              <div className="flex justify-between items-center">
                <span>Har användare:</span>
                {getStatusBadge(diagnostics.supabaseSession.hasUser)}
              </div>
              {diagnostics.supabaseSession.error && (
                <div className="mt-4 p-3 bg-red-50 rounded">
                  <p className="text-sm text-red-700">
                    <strong>Fel:</strong> {diagnostics.supabaseSession.error}
                  </p>
                </div>
              )}
              {diagnostics.supabaseSession.hasSession && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  {diagnostics.supabaseSession.email && (
                    <p className="text-sm"><strong>Email:</strong> {diagnostics.supabaseSession.email}</p>
                  )}
                  {diagnostics.supabaseSession.userId && (
                    <p className="text-sm"><strong>ID:</strong> {diagnostics.supabaseSession.userId}</p>
                  )}
                  {diagnostics.supabaseSession.expiresAt && (
                    <p className="text-sm"><strong>Går ut:</strong> {new Date(diagnostics.supabaseSession.expiresAt).toLocaleString('sv-SE')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cookies */}
        {diagnostics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Cookies
                {getStatusIcon(diagnostics.cookies.hasAuthCookies)}
              </CardTitle>
              <CardDescription>
                Autentiserings-cookies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Har auth-cookies:</span>
                {getStatusBadge(diagnostics.cookies.hasAuthCookies)}
              </div>
              <div className="flex justify-between items-center">
                <span>Antal cookies:</span>
                <Badge variant="outline">{diagnostics.cookies.cookieCount}</Badge>
              </div>
              {diagnostics.cookies.cookieNames.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium mb-2">Cookie-namn:</p>
                  <div className="flex flex-wrap gap-1">
                    {diagnostics.cookies.cookieNames.map((name, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* LocalStorage */}
        {diagnostics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                LocalStorage
                {getStatusIcon(diagnostics.localStorage.accessible)}
              </CardTitle>
              <CardDescription>
                Lokal lagring för autentisering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Tillgänglig:</span>
                {getStatusBadge(diagnostics.localStorage.accessible)}
              </div>
              <div className="flex justify-between items-center">
                <span>Har auth-data:</span>
                {getStatusBadge(diagnostics.localStorage.hasAuthData)}
              </div>
              {diagnostics.localStorage.keys.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium mb-2">Auth-nycklar:</p>
                  <div className="flex flex-wrap gap-1">
                    {diagnostics.localStorage.keys.map((key, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle>Systeminformation</CardTitle>
            <CardDescription>
              Miljö och konfiguration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Miljö:</strong> {diagnostics.environment}
              </div>
              <div>
                <strong>Hostname:</strong> {diagnostics.hostname}
              </div>
              <div>
                <strong>Tidsstämpel:</strong> {new Date(diagnostics.timestamp).toLocaleString('sv-SE')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 