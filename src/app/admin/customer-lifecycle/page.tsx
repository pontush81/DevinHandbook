'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Users, AlertTriangle, Calendar, Trash2, CheckCircle } from 'lucide-react'

interface Subscription {
  id: string
  user_id: string
  plan_type: string
  status: string
  started_at: string
  expires_at: string
  trial_ends_at: string
  cancelled_at: string
}

interface AccountStatus {
  id: string
  user_id: string
  status: string
  can_access_handbooks: boolean
  can_create_handbooks: boolean
  max_handbooks: number
  suspended_at: string
  scheduled_deletion_at: string
  warning_sent_at: string
  suspension_reason: string
}

interface AutomatedAction {
  id: string
  action_type: string
  target_user_id: string
  scheduled_for: string
  priority: number
  status: string
  attempts: number
  error_message: string
}

interface AccountDeletion {
  id: string
  user_id: string
  deletion_requested_at: string
  scheduled_deletion_at: string
  status: string
  deletion_reason: string
  warning_75_sent_at: string
  warning_85_sent_at: string
  warning_89_sent_at: string
}

export default function CustomerLifecyclePage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [accountStatuses, setAccountStatuses] = useState<AccountStatus[]>([])
  const [automatedActions, setAutomatedActions] = useState<AutomatedAction[]>([])
  const [accountDeletions, setAccountDeletions] = useState<AccountDeletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // supabase is already imported

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Ladda prenumerationer med användarinfo
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (subsError) throw subsError

      // Ladda kontostatus
      const { data: statusData, error: statusError } = await supabase
        .from('account_status')
        .select('*')
        .order('updated_at', { ascending: false })

      if (statusError) throw statusError

      // Ladda automatiska åtgärder
      const { data: actionsData, error: actionsError } = await supabase
        .from('automated_actions_queue')
        .select('*')
        .order('scheduled_for', { ascending: true })
        .limit(100)

      if (actionsError) throw actionsError

      // Ladda schemalagda raderingar
      const { data: deletionsData, error: deletionsError } = await supabase
        .from('account_deletions')
        .select('*')
        .order('scheduled_deletion_at', { ascending: true })

      if (deletionsError) throw deletionsError

      setSubscriptions(subsData || [])
      setAccountStatuses(statusData || [])
      setAutomatedActions(actionsData || [])
      setAccountDeletions(deletionsData || [])

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Kunde inte ladda data')
    } finally {
      setLoading(false)
    }
  }

  const runLifecycleCheck = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cron/customer-lifecycle?manual=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`HTTP ${response.status}: ${errorData.error || 'Failed to run lifecycle check'}`)
      }

      const result = await response.json()
      console.log('Lifecycle check result:', result)
      
      // Ladda om data
      await loadData()
      
      const errorCount = result.results.errors?.length || 0
      const errorText = errorCount > 0 ? `\n- Errors: ${errorCount}` : ''
      
      alert(`Lifecycle check completed!\n\nResults:\n- Subscriptions checked: ${result.results.subscriptions_checked}\n- Actions scheduled: ${result.results.actions_scheduled}\n- Accounts suspended: ${result.results.accounts_suspended}\n- Warnings sent: ${result.results.warnings_sent}${errorText}`)
      
    } catch (err) {
      console.error('Error running lifecycle check:', err)
      alert(`Fel vid körning av lifecycle check: ${err instanceof Error ? err.message : 'Okänt fel'}`)
    } finally {
      setLoading(false)
    }
  }

  const testStripeIntegration = async () => {
    try {
      setLoading(true)
      
      // Använd nuvarande användares ID för testet
      const testData = {
        userId: '9919f4f3-2748-4379-8b8c-790be1d08ae6', // Din user ID från loggarna
        handbookName: 'Test Handbok - Stripe Integration',
        subdomain: `test-stripe-${Date.now()}`
      }
      
      const response = await fetch('/api/test-stripe-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Test failed')
      }
      
      console.log('Stripe integration test result:', result)
      
      // Ladda om data för att visa nya records
      await loadData()
      
      alert(`Stripe integration test completed successfully!\n\nCreated:\n- Handbook ID: ${result.data.handbookId}\n- Subdomain: ${result.data.subdomain}\n- Stripe Session: ${result.data.stripeSessionId}\n\nCheck the tabs to see the new subscription and lifecycle events.`)
      
    } catch (err) {
      console.error('Error testing Stripe integration:', err)
      alert(`Fel vid test av Stripe integration: ${err instanceof Error ? err.message : 'Okänt fel'}`)
    } finally {
      setLoading(false)
    }
  }

  const cancelSubscription = async (subscriptionId: string, reason: string = 'admin_cancelled') => {
    if (!confirm('Är du säker på att du vill avsluta denna prenumeration? Detta kommer att initiera offboarding-processen.')) {
      return
    }
    
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscriptionId, reason })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription')
      }
      
      await loadData()
      alert(`Prenumeration avslutad!\n\nOffboarding initierat:\n- 90-dagars varning skickad\n- Konto kommer att raderas: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE')}`)
      
    } catch (err) {
      console.error('Error cancelling subscription:', err)
      alert(`Fel vid avslutning av prenumeration: ${err instanceof Error ? err.message : 'Okänt fel'}`)
    } finally {
      setLoading(false)
    }
  }

  const suspendAccount = async (userId: string, reason: string = 'admin_suspended') => {
    const suspensionReason = prompt('Ange anledning för suspension:', reason)
    if (!suspensionReason) return
    
    if (!confirm('Är du säker på att du vill suspendera detta konto?')) {
      return
    }
    
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/suspend-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, reason: suspensionReason })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to suspend account')
      }
      
      await loadData()
      alert('Konto suspenderat!')
      
    } catch (err) {
      console.error('Error suspending account:', err)
      alert(`Fel vid suspension av konto: ${err instanceof Error ? err.message : 'Okänt fel'}`)
    } finally {
      setLoading(false)
    }
  }

  const createStripePortalSession = async (customerId: string) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customerId })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create portal session')
      }
      
      // Öppna Stripe portal i nytt fönster
      window.open(result.url, '_blank')
      
    } catch (err) {
      console.error('Error creating portal session:', err)
      alert(`Fel vid skapande av portal-session: ${err instanceof Error ? err.message : 'Okänt fel'}`)
    } finally {
      setLoading(false)
    }
  }

  const cancelDeletion = async (deletionId: string) => {
    try {
      const { error } = await supabase
        .from('account_deletions')
        .update({ status: 'cancelled' })
        .eq('id', deletionId)

      if (error) throw error

      await loadData()
      alert('Radering avbruten')
    } catch (err) {
      console.error('Error cancelling deletion:', err)
      alert('Fel vid avbrytning av radering')
    }
  }

  const reactivateAccount = async (userId: string) => {
    try {
      // Reaktivera kontot
      const { error: statusError } = await supabase
        .from('account_status')
        .update({
          status: 'active',
          can_access_handbooks: true,
          can_create_handbooks: true,
          suspended_at: null,
          suspension_reason: null,
          scheduled_deletion_at: null
        })
        .eq('user_id', userId)

      if (statusError) throw statusError

      // Avbryt väntande raderingar
      const { error: deletionError } = await supabase
        .from('account_deletions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'pending')

      if (deletionError) throw deletionError

      await loadData()
      alert('Konto reaktiverat')
    } catch (err) {
      console.error('Error reactivating account:', err)
      alert('Fel vid reaktivering av konto')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'trial': return 'bg-blue-100 text-blue-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'pending_deletion': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'bg-red-100 text-red-800'
    if (priority <= 4) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  if (loading && subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Lifecycle Management</h1>
        <div className="flex gap-2">
          <Button onClick={runLifecycleCheck} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Kör Lifecycle Check
          </Button>
          
          <Button onClick={testStripeIntegration} disabled={loading} variant="outline">
            <CheckCircle className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Testa Stripe Integration
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="subscriptions">Prenumerationer</TabsTrigger>
          <TabsTrigger value="actions">Automatiska Åtgärder</TabsTrigger>
          <TabsTrigger value="deletions">Schemalagda Raderingar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktiva Prenumerationer</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {subscriptions.filter(s => s.status === 'active').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspenderade Konton</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {accountStatuses.filter(a => a.status === 'suspended').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Väntande Åtgärder</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {automatedActions.filter(a => a.status === 'pending').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Schemalagda Raderingar</CardTitle>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {accountDeletions.filter(d => d.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Senaste Kontostatus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {accountStatuses.slice(0, 5).map((status) => (
                    <div key={status.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <span className="text-sm">{status.user_id}</span>
                        {status.suspension_reason && (
                          <div className="text-xs text-red-600">
                            Anledning: {status.suspension_reason}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(status.status)}>
                          {status.status}
                        </Badge>
                        {status.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => suspendAccount(status.user_id)}
                            disabled={loading}
                          >
                            Suspendera
                          </Button>
                        )}
                        {status.status === 'suspended' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reactivateAccount(status.user_id)}
                            disabled={loading}
                          >
                            Reaktivera
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kommande Åtgärder</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {automatedActions.filter(a => a.status === 'pending').slice(0, 5).map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="text-sm font-medium">{action.action_type}</span>
                        <div className="text-xs text-gray-500">
                          {new Date(action.scheduled_for).toLocaleString('sv-SE')}
                        </div>
                      </div>
                      <Badge className={getPriorityColor(action.priority)}>
                        P{action.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alla Prenumerationer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-4 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{sub.user_id}</div>
                        <div className="text-sm text-gray-500">
                          Plan: {sub.plan_type} | Startade: {new Date(sub.started_at).toLocaleDateString('sv-SE')}
                          {sub.expires_at && ` | Går ut: ${new Date(sub.expires_at).toLocaleDateString('sv-SE')}`}
                          {sub.trial_ends_at && ` | Trial slutar: ${new Date(sub.trial_ends_at).toLocaleDateString('sv-SE')}`}
                        </div>
                        {sub.stripe_customer_id && (
                          <div className="text-xs text-blue-600">
                            Stripe Customer: {sub.stripe_customer_id}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(sub.status)}>
                          {sub.status}
                        </Badge>
                        {sub.status === 'active' && (
                          <>
                            {sub.stripe_customer_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => createStripePortalSession(sub.stripe_customer_id)}
                                disabled={loading}
                              >
                                Stripe Portal
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => cancelSubscription(sub.id)}
                              disabled={loading}
                            >
                              Avsluta
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatiska Åtgärder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {automatedActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <div className="font-medium">{action.action_type}</div>
                      <div className="text-sm text-gray-500">
                        Användare: {action.target_user_id}
                      </div>
                      <div className="text-sm text-gray-500">
                        Schemalagd: {new Date(action.scheduled_for).toLocaleString('sv-SE')}
                      </div>
                      {action.error_message && (
                        <div className="text-sm text-red-500">
                          Fel: {action.error_message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(action.priority)}>
                        P{action.priority}
                      </Badge>
                      <Badge className={getStatusColor(action.status)}>
                        {action.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deletions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schemalagda Raderingar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {accountDeletions.map((deletion) => (
                  <div key={deletion.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <div className="font-medium">{deletion.user_id}</div>
                      <div className="text-sm text-gray-500">
                        Begärd: {new Date(deletion.deletion_requested_at).toLocaleDateString('sv-SE')}
                      </div>
                      <div className="text-sm text-gray-500">
                        Schemalagd radering: {new Date(deletion.scheduled_deletion_at).toLocaleDateString('sv-SE')}
                      </div>
                      <div className="text-sm text-gray-500">
                        Anledning: {deletion.deletion_reason}
                      </div>
                      <div className="text-xs text-gray-400">
                        Varningar: 
                        {deletion.warning_75_sent_at && ' 75d ✓'}
                        {deletion.warning_85_sent_at && ' 85d ✓'}
                        {deletion.warning_89_sent_at && ' 89d ✓'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(deletion.status)}>
                        {deletion.status}
                      </Badge>
                      {deletion.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelDeletion(deletion.id)}
                        >
                          Avbryt
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 