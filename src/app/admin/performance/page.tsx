"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  BarChart3,
  Target
} from "lucide-react";
import { getSupabaseClient } from '@/lib/supabase-client';

const supabase = getSupabaseClient();

interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  errorRequests: number;
  slowRequestPercentage: number;
  errorPercentage: number;
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: string;
  details: {
    database: 'ok' | 'error';
    memory: 'ok' | 'warning' | 'error';
    cpu: 'ok' | 'warning' | 'error';
  };
}

interface PerformanceLog {
  id: string;
  endpoint_path: string;
  method: string;
  response_time_ms: number;
  status_code: number;
  user_agent: string;
  created_at: string;
  error_message?: string;
}

interface HourlyTrend {
  hour: string;
  requests: number;
  averageTime: number;
  errorRate: number;
}

interface EndpointStats {
  [endpoint: string]: {
    requests: number;
    averageTime: number;
    slowRequests: number;
    errorRequests: number;
  };
}

interface PerformanceData {
  handbook_id: string;
  period: string;
  stats: PerformanceStats;
  health: HealthCheck;
  recentLogs: PerformanceLog[];
  endpointBreakdown: EndpointStats;
  hourlyTrends: HourlyTrend[];
  generatedAt: string;
  note?: string;
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHandbook, setSelectedHandbook] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('7');
  const [handbooks, setHandbooks] = useState<Array<{id: string, title: string}>>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch available handbooks
  useEffect(() => {
    const fetchHandbooks = async () => {
      try {
        // Get current user's session token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('No authentication token found');
          return;
        }

        const response = await fetch('/api/user/handbooks', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result)) {
            setHandbooks(result);
            if (result.length > 0 && !selectedHandbook) {
              setSelectedHandbook(result[0].id);
            }
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error fetching handbooks:', err);
        setError('Failed to load handbooks');
      }
    };

    fetchHandbooks();
  }, []);

  // Fetch performance data
  const fetchPerformanceData = async () => {
    if (!selectedHandbook) return;

    setLoading(true);
    setError(null);

    try {
      // Get current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(
        `/api/admin/performance-stats?handbook_id=${selectedHandbook}&days=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when handbook or period changes
  useEffect(() => {
    fetchPerformanceData();
  }, [selectedHandbook, selectedPeriod]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchPerformanceData, 30000);
    return () => clearInterval(interval);
  }, [selectedHandbook, selectedPeriod]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatTime = (ms: number) => {
    if (ms >= 1000) {
      return (ms / 1000).toFixed(1) + 's';
    }
    return ms.toFixed(0) + 'ms';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prestanda-övervakning</h1>
          <p className="text-gray-500 mt-1">
            Övervaka systemets prestanda och hälsa
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            Senast uppdaterat: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPerformanceData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Uppdatera
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Handbok:</label>
          <Select value={selectedHandbook} onValueChange={setSelectedHandbook}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Välj handbok..." />
            </SelectTrigger>
            <SelectContent>
              {handbooks.map(handbook => (
                <SelectItem key={handbook.id} value={handbook.id}>
                  {handbook.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Period:</label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 dag</SelectItem>
              <SelectItem value="7">7 dagar</SelectItem>
              <SelectItem value="30">30 dagar</SelectItem>
              <SelectItem value="90">90 dagar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">Fel:</span>
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {data?.note && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="text-blue-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-blue-900">Information</div>
              <div className="text-blue-700">{data.note}</div>
            </div>
          </div>
        </div>
      )}

      {data && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Översikt</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="trends">Trender</TabsTrigger>
            <TabsTrigger value="logs">Loggar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Health Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className={getHealthColor(data.health.status)}>
                    {getHealthIcon(data.health.status)}
                  </div>
                  <span>Systemhälsa</span>
                  <Badge variant={data.health.status === 'healthy' ? 'default' : 'destructive'}>
                    {data.health.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatTime(data.health.responseTime)}
                    </div>
                    <div className="text-sm text-gray-500">Responstid</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${data.health.details.database === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                      {data.health.details.database === 'ok' ? '✓' : '✗'}
                    </div>
                    <div className="text-sm text-gray-500">Databas</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${data.health.details.memory === 'ok' ? 'text-green-600' : data.health.details.memory === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {data.health.details.memory === 'ok' ? '✓' : data.health.details.memory === 'warning' ? '⚠' : '✗'}
                    </div>
                    <div className="text-sm text-gray-500">Minne</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${data.health.details.cpu === 'ok' ? 'text-green-600' : data.health.details.cpu === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {data.health.details.cpu === 'ok' ? '✓' : data.health.details.cpu === 'warning' ? '⚠' : '✗'}
                    </div>
                    <div className="text-sm text-gray-500">CPU</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Totala förfrågningar</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(data.stats.totalRequests)}</div>
                  <p className="text-xs text-muted-foreground">
                    Senaste {data.period}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Genomsnittlig responstid</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatTime(data.stats.averageResponseTime)}</div>
                  <p className="text-xs text-muted-foreground">
                    Medel för perioden
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Långsamma förfrågningar</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {data.stats.slowRequestPercentage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(data.stats.slowRequests)} av {formatNumber(data.stats.totalRequests)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fel-frekvens</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${data.stats.errorPercentage > 1 ? 'text-red-600' : 'text-green-600'}`}>
                    {data.stats.errorPercentage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(data.stats.errorRequests)} fel
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Endpoint-prestanda</CardTitle>
                <CardDescription>
                  Prestandastatistik per API-endpoint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.endpointBreakdown).length > 0 ? (
                    Object.entries(data.endpointBreakdown).map(([endpoint, stats]) => (
                    <div key={endpoint} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">{endpoint}</div>
                        <Badge variant="outline">{formatNumber(stats.requests)} förfrågningar</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Medel responstid</div>
                          <div className="font-medium">{formatTime(stats.averageTime)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Långsamma</div>
                          <div className="font-medium text-yellow-600">{stats.slowRequests}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Fel</div>
                          <div className="font-medium text-red-600">{stats.errorRequests}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Framgångsfrekvens</div>
                          <div className="font-medium text-green-600">
                            {((stats.requests - stats.errorRequests) / stats.requests * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Inga endpoint-data tillgängliga</h3>
                    <p className="text-gray-500 mt-2">Det finns inga prestandadata att visa för valda period.</p>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prestanda-trender (24h)</CardTitle>
                <CardDescription>
                  Förfrågningar och responstider per timme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.hourlyTrends.length > 0 ? (
                    data.hourlyTrends.map((trend, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 w-20">
                        {new Date(trend.hour).toLocaleTimeString('sv-SE', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Förfrågningar</div>
                          <div className="font-medium">{trend.requests}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Medel responstid</div>
                          <div className="font-medium">{formatTime(trend.averageTime)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Fel-frekvens</div>
                          <div className={`font-medium ${trend.errorRate > 1 ? 'text-red-600' : 'text-green-600'}`}>
                            {trend.errorRate}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Inga trenddata tillgängliga</h3>
                    <p className="text-gray-500 mt-2">Det finns inga trenddata att visa för valda period.</p>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Senaste prestandaloggar</CardTitle>
                <CardDescription>
                  De 10 senaste förfrågningarna
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.recentLogs.length > 0 ? (
                    data.recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={log.status_code >= 400 ? 'destructive' : 'default'}>
                          {log.status_code}
                        </Badge>
                        <div className="font-medium text-gray-900">{log.method} {log.endpoint_path}</div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className={`font-medium ${log.response_time_ms > 1000 ? 'text-red-600' : log.response_time_ms > 500 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {formatTime(log.response_time_ms)}
                        </div>
                        <div>
                          {new Date(log.created_at).toLocaleString('sv-SE')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Inga loggar tillgängliga</h3>
                    <p className="text-gray-500 mt-2">Det finns inga loggar att visa för valda period.</p>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 