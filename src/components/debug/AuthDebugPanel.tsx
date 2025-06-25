"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { runAuthDiagnostics, logAuthDiagnostics, fixAuthIssues, type AuthDiagnostics } from '@/lib/auth-diagnostics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bug, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface WebhookStatus {
  summary: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    successRate: string;
    avgProcessingTimeMs: number;
    criticalEventsCount: number;
    criticalSuccessRate: string;
  };
  eventTypes: Record<string, number>;
  recentFailures: Array<{
    eventType: string;
    eventId: string;
    errorMessage: string;
    processingTimeMs: number;
    retryCount: number;
    processedAt: string;
    testMode: boolean;
  }>;
  recommendations: string[];
}

export function AuthDebugPanel() {
  const { user, session, isLoading, refreshAuth } = useAuth();
  const [diagnostics, setDiagnostics] = useState<AuthDiagnostics | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string } | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);

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

  const loadWebhookStatus = async () => {
    setIsLoadingWebhooks(true);
    try {
      const response = await fetch('/api/debug/webhook-status');
      if (response.ok) {
        const status = await response.json();
        setWebhookStatus(status);
      } else {
        console.error('Failed to load webhook status:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading webhook status:', error);
    } finally {
      setIsLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    // Kör diagnostik automatiskt när komponenten laddas
    runDiagnostics();
    loadWebhookStatus();
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

      {/* Webhook Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Webhook-övervakning
            {webhookStatus && getStatusIcon(
              parseFloat(webhookStatus.summary.successRate.replace('%', '')) > 90,
              parseFloat(webhookStatus.summary.successRate.replace('%', '')) < 80
            )}
            <Button 
              onClick={loadWebhookStatus} 
              disabled={isLoadingWebhooks}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              {isLoadingWebhooks ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Stripe webhook-prestanda och fel (senaste 24h)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingWebhooks ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Laddar webhook-status...</span>
            </div>
          ) : webhookStatus ? (
            <div className="space-y-6">
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    {webhookStatus.summary.totalEvents}
                  </div>
                  <div className="text-sm text-gray-600">Totalt events</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {webhookStatus.summary.successRate}
                  </div>
                  <div className="text-sm text-gray-600">Framgångsgrad</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded">
                  <div className="text-2xl font-bold text-orange-600">
                    {webhookStatus.summary.avgProcessingTimeMs}ms
                  </div>
                  <div className="text-sm text-gray-600">Snitt-tid</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <div className="text-2xl font-bold text-purple-600">
                    {webhookStatus.summary.criticalSuccessRate}
                  </div>
                  <div className="text-sm text-gray-600">Betalningar OK</div>
                </div>
              </div>

              {/* Recommendations */}
              {webhookStatus.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Rekommendationer:</h4>
                  {webhookStatus.recommendations.map((rec, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded text-sm ${
                        rec.includes('🚨') ? 'bg-red-50 text-red-800 border border-red-200' :
                        rec.includes('⚠️') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                        rec.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
                        'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {rec}
                    </div>
                  ))}
                </div>
              )}

              {/* Event Types */}
              {Object.keys(webhookStatus.eventTypes).length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Event-typer (senaste 24h):</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(webhookStatus.eventTypes).map(([eventType, count]) => (
                      <div key={eventType} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-mono">{eventType}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Failures */}
              {webhookStatus.recentFailures.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Senaste fel:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {webhookStatus.recentFailures.map((failure, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-red-800">{failure.eventType}</span>
                          <div className="flex gap-2">
                            {failure.testMode && (
                              <Badge variant="outline" className="text-xs">TEST</Badge>
                            )}
                            <Badge variant="destructive" className="text-xs">
                              Retry: {failure.retryCount}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-red-700 mb-1">{failure.errorMessage}</p>
                        <div className="text-xs text-red-600">
                          {new Date(failure.processedAt).toLocaleString('sv-SE')} • 
                          {failure.processingTimeMs}ms • 
                          ID: {failure.eventId.substring(0, 12)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Klicka på uppdatera för att ladda webhook-status
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 