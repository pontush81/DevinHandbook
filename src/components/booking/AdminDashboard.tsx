"use client"

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  BarChart3,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminDashboardProps {
  handbookId: string;
  userRole: 'owner' | 'admin' | 'member' | 'moderator';
}

interface BookingMetrics {
  totalBookings: number;
  activeBookings: number;
  upcomingBookings24h: number;
  cancellationRate: number;
  noShowRate: number;
  resourceUtilization: Record<string, number>;
  peakHours: { hour: number; bookings: number }[];
  topUsers: { userId: string; userName: string; bookingCount: number }[];
  recentActivity: {
    id: string;
    type: 'booking_created' | 'booking_cancelled' | 'no_show';
    resourceName: string;
    userName: string;
    timestamp: Date;
  }[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ handbookId, userRole }) => {
  const [metrics, setMetrics] = useState<BookingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  // Only allow admin/owner access
  if (!['owner', 'admin'].includes(userRole)) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Endast administratörer och ägare har tillgång till dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  useEffect(() => {
    fetchMetrics();
  }, [handbookId, timeframe]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/booking-metrics?handbook_id=${handbookId}&timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta metrics');
      }
      
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Admin Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Kunde inte ladda dashboard-data. Försök igen senare.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Bokningsdashboard
        </h2>
        <div className="flex gap-2">
          <Button 
            variant={timeframe === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('week')}
          >
            Vecka
          </Button>
          <Button 
            variant={timeframe === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('month')}
          >
            Månad
          </Button>
          <Button 
            variant={timeframe === 'quarter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('quarter')}
          >
            Kvartal
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totala bokningar</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {timeframe === 'week' ? 'denna vecka' : timeframe === 'month' ? 'denna månad' : 'detta kvartal'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiva bokningar</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              pågående just nu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kommande 24h</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.upcomingBookings24h}</div>
            <p className="text-xs text-muted-foreground">
              bokningar nästa dygn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avbokningsfrekvens</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.cancellationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              av alla bokningar
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="resources">Resurser</TabsTrigger>
          <TabsTrigger value="users">Användare</TabsTrigger>
          <TabsTrigger value="activity">Aktivitet</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Populära tider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.peakHours.slice(0, 5).map((peak, index) => (
                    <div key={peak.hour} className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {peak.hour.toString().padStart(2, '0')}:00 - {(peak.hour + 1).toString().padStart(2, '0')}:00
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(peak.bookings / Math.max(...metrics.peakHours.map(p => p.bookings))) * 100}%` }}
                          />
                        </div>
                        <Badge variant="secondary">{peak.bookings}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* No-Show Alert */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Kvalitetsmätning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">No-show frekvens</span>
                    <Badge variant={metrics.noShowRate > 10 ? "destructive" : metrics.noShowRate > 5 ? "secondary" : "default"}>
                      {metrics.noShowRate.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avbokningar</span>
                    <Badge variant={metrics.cancellationRate > 20 ? "destructive" : metrics.cancellationRate > 10 ? "secondary" : "default"}>
                      {metrics.cancellationRate.toFixed(1)}%
                    </Badge>
                  </div>

                  {(metrics.noShowRate > 10 || metrics.cancellationRate > 20) && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Höga avboknings- eller no-show-frekvenser kan tyda på problem med bokningsreglerna eller kommunikation.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resursanvändning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.resourceUtilization).map(([resourceName, utilization]) => (
                  <div key={resourceName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{resourceName}</span>
                      <span className="text-sm text-muted-foreground">{utilization.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          utilization > 80 ? 'bg-red-600' : 
                          utilization > 60 ? 'bg-yellow-600' : 
                          'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mest aktiva användare</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topUsers.slice(0, 10).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{user.userName}</span>
                    </div>
                    <Badge>{user.bookingCount} bokningar</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Senaste aktivitet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.recentActivity.slice(0, 20).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-3">
                      {activity.type === 'booking_created' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {activity.type === 'booking_cancelled' && <XCircle className="h-4 w-4 text-red-600" />}
                      {activity.type === 'no_show' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                      
                      <div>
                        <p className="text-sm font-medium">{activity.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.type === 'booking_created' && 'Skapade bokning för '}
                          {activity.type === 'booking_cancelled' && 'Avbokade '}
                          {activity.type === 'no_show' && 'Uteblivit från '}
                          {activity.resourceName}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString('sv-SE')} {new Date(activity.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;