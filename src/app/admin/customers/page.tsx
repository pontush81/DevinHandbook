"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Calendar,
  Mail,
  Clock,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Trash2,
  CheckCircle,
  CreditCard,
  Settings
} from "lucide-react";
import { supabase } from '@/lib/supabase';

interface UserStats {
  totalUsers: number;
  confirmedUsers: number;
  confirmationRate: number;
  usersToday: number;
  usersYesterday: number;
  usersThisWeek: number;
  usersThisMonth: number;
  usersThisYear: number;
  growthToday: number;
  monthlyStats: Array<{
    month: string;
    users: number;
    confirmed: number;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    created_at: string;
    confirmed: boolean;
  }>;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
  trial_ends_at: string;
  cancelled_at: string;
}

interface AccountStatus {
  id: string;
  user_id: string;
  status: string;
  can_access_handbooks: boolean;
  can_create_handbooks: boolean;
  max_handbooks: number;
  suspended_at: string;
  scheduled_deletion_at: string;
  warning_sent_at: string;
  suspension_reason: string;
}

interface AutomatedAction {
  id: string;
  action_type: string;
  target_user_id: string;
  scheduled_for: string;
  priority: number;
  status: string;
  attempts: number;
  error_message: string;
}

interface AccountDeletion {
  id: string;
  user_id: string;
  deletion_requested_at: string;
  scheduled_deletion_at: string;
  status: string;
  deletion_reason: string;
  warning_75_sent_at: string;
  warning_85_sent_at: string;
  warning_89_sent_at: string;
}

export default function CustomersPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [accountStatuses, setAccountStatuses] = useState<AccountStatus[]>([]);
  const [automatedActions, setAutomatedActions] = useState<AutomatedAction[]>([]);
  const [accountDeletions, setAccountDeletions] = useState<AccountDeletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Helper function to create auth headers
      const createAuthHeaders = async () => {
        try {
          console.log('[Customers Page] Getting session for auth headers...');
          const { data: { session }, error } = await supabase.auth.getSession();
          console.log('[Customers Page] Session result:', { hasSession: !!session, hasToken: !!session?.access_token, error });
          if (session?.access_token) {
            return {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            };
          }
        } catch (error) {
          console.log('[Customers Page] Error getting session:', error);
        }
        return { 'Content-Type': 'application/json' };
      };
      
      // Since we know user is authenticated, start with Bearer token authentication
      const headers = await createAuthHeaders();
      let response = await fetch('/api/admin/user-stats', { headers });
      console.log('[Customers Page] First response status:', response.status);
      
      // If Bearer token fails, try without auth headers as fallback
      if (!response.ok && response.status === 401) {
        console.log('[Customers Page] Bearer token failed, trying without auth headers...');
        response = await fetch('/api/admin/user-stats', {
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('[Customers Page] Fallback response status:', response.status);
      }
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta användarstatistik');
      }
      
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Fel vid hämtning av användarstatistik:', err);
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLifecycleData = async () => {
    try {
      setError(null);

      // Ladda prenumerationer
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // Ladda kontostatus
      const { data: statusData, error: statusError } = await supabase
        .from('account_status')
        .select('*')
        .order('updated_at', { ascending: false });

      if (statusError) throw statusError;

      // Ladda automatiska åtgärder
      const { data: actionsData, error: actionsError } = await supabase
        .from('automated_actions_queue')
        .select('*')
        .order('scheduled_for', { ascending: true })
        .limit(100);

      if (actionsError) throw actionsError;

      // Ladda schemalagda raderingar
      const { data: deletionsData, error: deletionsError } = await supabase
        .from('account_deletions')
        .select('*')
        .order('scheduled_deletion_at', { ascending: true });

      if (deletionsError) throw deletionsError;

      setSubscriptions(subsData || []);
      setAccountStatuses(statusData || []);
      setAutomatedActions(actionsData || []);
      setAccountDeletions(deletionsData || []);

    } catch (err) {
      console.error('Error loading lifecycle data:', err);
      setError('Kunde inte ladda livscykeldata');
    }
  };

  const loadAllData = async () => {
    await Promise.all([fetchStats(), loadLifecycleData()]);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const runLifecycleCheck = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/cron/customer-lifecycle?manual=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${errorData.error || 'Failed to run lifecycle check'}`);
      }

      const result = await response.json();
      console.log('Lifecycle check result:', result);
      
      await loadAllData();
      
      const errorCount = result.results.errors?.length || 0;
      const errorText = errorCount > 0 ? `\n- Errors: ${errorCount}` : '';
      
      alert(`Lifecycle check completed!\n\nResults:\n- Subscriptions checked: ${result.results.subscriptions_checked}\n- Actions scheduled: ${result.results.actions_scheduled}\n- Accounts suspended: ${result.results.accounts_suspended}\n- Warnings sent: ${result.results.warnings_sent}${errorText}`);
      
    } catch (err) {
      console.error('Error running lifecycle check:', err);
      alert(`Fel vid körning av lifecycle check: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testStripeIntegration = async () => {
    try {
      setIsLoading(true);
      
      const testData = {
        userId: '9919f4f3-2748-4379-8b8c-790be1d08ae6',
        handbookName: 'Test Handbok - Stripe Integration',
        subdomain: `test-stripe-${Date.now()}`
      };
      
      const response = await fetch('/api/test-stripe-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Test failed');
      }
      
      await loadAllData();
      
      alert(`Stripe integration test completed successfully!\n\nCreated:\n- Handbook ID: ${result.data.handbookId}\n- Subdomain: ${result.data.subdomain}\n- Stripe Session: ${result.data.stripeSessionId}\n\nCheck the tabs to see the new subscription and lifecycle events.`);
      
    } catch (err) {
      console.error('Error testing Stripe integration:', err);
      alert(`Fel vid test av Stripe integration: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'bg-red-100 text-red-800';
    if (priority >= 2) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <span>❌</span>
              <span>{error}</span>
            </div>
            <Button onClick={loadAllData} className="mt-4" variant="outline">
              Försök igen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const suspendedAccounts = accountStatuses.filter(s => s.status === 'suspended').length;
  const pendingActions = automatedActions.filter(a => a.status === 'pending').length;
  const scheduledDeletions = accountDeletions.filter(d => d.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kundhantering</h1>
          <p className="text-gray-500 mt-1">Komplett översikt över kunder, prenumerationer och livscykel</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Senast uppdaterad: {lastUpdated.toLocaleString('sv-SE')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAllData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Uppdatera
          </Button>
          <Button onClick={runLifecycleCheck} variant="default" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Kör Lifecycle Check
          </Button>
          <Button onClick={testStripeIntegration} variant="secondary" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Testa Stripe Integration
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-orange-600">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="subscriptions">Prenumerationer</TabsTrigger>
          <TabsTrigger value="actions">Automatiska Åtgärder</TabsTrigger>
          <TabsTrigger value="deletions">Schemalagda Raderingar</TabsTrigger>
          <TabsTrigger value="analytics">Statistik</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totalt användare</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.confirmationRate || 0}% bekräftade
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktiva Prenumerationer</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground">
                  {subscriptions.length} totalt
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspenderade Konton</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{suspendedAccounts}</div>
                <p className="text-xs text-muted-foreground">
                  {scheduledDeletions} schemalagda raderingar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Väntande Åtgärder</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingActions}</div>
                <p className="text-xs text-muted-foreground">
                  {automatedActions.length} totalt i kö
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Senaste Prenumerationer</CardTitle>
                <CardDescription>De 5 senaste prenumerationsändringarna</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subscriptions.slice(0, 5).map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{sub.plan_type}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(sub.started_at).toLocaleDateString('sv-SE')}
                        </div>
                      </div>
                      <Badge className={getStatusColor(sub.status)}>
                        {sub.status}
                      </Badge>
                    </div>
                  ))}
                  {subscriptions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Inga prenumerationer ännu
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kommande Åtgärder</CardTitle>
                <CardDescription>Automatiska åtgärder schemalagda framöver</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {automatedActions.slice(0, 5).map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{action.action_type}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(action.scheduled_for).toLocaleDateString('sv-SE')}
                        </div>
                      </div>
                      <Badge className={getPriorityColor(action.priority)}>
                        P{action.priority}
                      </Badge>
                    </div>
                  ))}
                  {automatedActions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Inga schemalagda åtgärder
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alla Prenumerationer ({subscriptions.length})</CardTitle>
              <CardDescription>Detaljerad vy över alla prenumerationer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{sub.plan_type}</div>
                        <div className="text-sm text-gray-500">ID: {sub.id}</div>
                        <div className="text-sm text-gray-500">Användare: {sub.user_id}</div>
                      </div>
                      <Badge className={getStatusColor(sub.status)}>
                        {sub.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Startad:</span><br />
                        {new Date(sub.started_at).toLocaleDateString('sv-SE')}
                      </div>
                      <div>
                        <span className="font-medium">Upphör:</span><br />
                        {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('sv-SE') : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Trial slutar:</span><br />
                        {sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString('sv-SE') : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Avslutad:</span><br />
                        {sub.cancelled_at ? new Date(sub.cancelled_at).toLocaleDateString('sv-SE') : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
                {subscriptions.length === 0 && (
                  <p className="text-center py-8 text-gray-500">
                    Inga prenumerationer hittades
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automatiska Åtgärder ({automatedActions.length})</CardTitle>
              <CardDescription>Schemalagda och genomförda automatiska åtgärder</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automatedActions.map((action) => (
                  <div key={action.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{action.action_type}</div>
                        <div className="text-sm text-gray-500">Användare: {action.target_user_id}</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getPriorityColor(action.priority)}>
                          P{action.priority}
                        </Badge>
                        <Badge className={getStatusColor(action.status)}>
                          {action.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Schemalagd:</span><br />
                        {new Date(action.scheduled_for).toLocaleString('sv-SE')}
                      </div>
                      <div>
                        <span className="font-medium">Försök:</span><br />
                        {action.attempts}
                      </div>
                      <div>
                        <span className="font-medium">Fel:</span><br />
                        {action.error_message || 'Inga fel'}
                      </div>
                    </div>
                  </div>
                ))}
                {automatedActions.length === 0 && (
                  <p className="text-center py-8 text-gray-500">
                    Inga automatiska åtgärder hittades
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deletions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schemalagda Raderingar ({accountDeletions.length})</CardTitle>
              <CardDescription>Konton som är schemalagda för radering</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accountDeletions.map((deletion) => (
                  <div key={deletion.id} className="border rounded-lg p-4 space-y-2 border-red-200 bg-red-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-red-800">Användare: {deletion.user_id}</div>
                        <div className="text-sm text-red-600">Anledning: {deletion.deletion_reason}</div>
                      </div>
                      <Badge className="bg-red-100 text-red-800">
                        {deletion.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Begärd:</span><br />
                        {new Date(deletion.deletion_requested_at).toLocaleDateString('sv-SE')}
                      </div>
                      <div>
                        <span className="font-medium">Schemalagd:</span><br />
                        {new Date(deletion.scheduled_deletion_at).toLocaleDateString('sv-SE')}
                      </div>
                      <div>
                        <span className="font-medium">Varning 75%:</span><br />
                        {deletion.warning_75_sent_at ? new Date(deletion.warning_75_sent_at).toLocaleDateString('sv-SE') : 'Ej skickad'}
                      </div>
                      <div>
                        <span className="font-medium">Varning 89%:</span><br />
                        {deletion.warning_89_sent_at ? new Date(deletion.warning_89_sent_at).toLocaleDateString('sv-SE') : 'Ej skickad'}
                      </div>
                    </div>
                  </div>
                ))}
                {accountDeletions.length === 0 && (
                  <p className="text-center py-8 text-gray-500">
                    Inga schemalagda raderingar
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {stats && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Nya idag</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.usersToday}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.growthToday > 0 ? '+' : ''}{stats.growthToday}% vs igår
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Denna vecka</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.usersThisWeek}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.usersThisMonth} denna månaden
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">E-postbekräftelse</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.confirmedUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      av {stats.totalUsers} användare
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Denna året</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.usersThisYear}</div>
                    <p className="text-xs text-muted-foreground">
                      Totalt tillväxt i år
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Recent Users */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Månadsvis tillväxt</CardTitle>
                    <CardDescription>
                      Nya användare de senaste 6 månaderna
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.monthlyStats.slice(-6).map((month) => (
                        <div key={month.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{month.month}</div>
                            <div className="text-sm text-gray-500">
                              {month.confirmed} av {month.users} bekräftade
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{month.users}</div>
                            <div className="text-xs text-gray-500">
                              {month.users > 0 ? Math.round((month.confirmed / month.users) * 100) : 0}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Users */}
                <Card>
                  <CardHeader>
                    <CardTitle>Senaste användare</CardTitle>
                    <CardDescription>
                      De 10 senast registrerade användarna
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{user.email}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString('sv-SE')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {user.confirmed ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Bekräftad
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Väntar
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 