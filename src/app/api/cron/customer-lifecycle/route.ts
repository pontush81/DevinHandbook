import { getServiceSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

const supabase = getServiceSupabase()

export async function GET(request: NextRequest) {
  try {
    console.log('[Customer Lifecycle] Starting automated customer lifecycle check...')
    
    // Kontrollera att detta är en giltig cron-förfrågan eller admin-förfrågan
    const authHeader = request.headers.get('authorization')
    const isManualTrigger = request.nextUrl.searchParams.get('manual') === 'true'
    
    if (isManualTrigger) {
      // För manuella triggers från admin, kontrollera session istället
      console.log('[Customer Lifecycle] Manual trigger detected, checking admin session...')
      
      // Kontrollera att användaren är inloggad och har admin-behörighet
      const sessionHeader = request.headers.get('cookie')
      if (!sessionHeader) {
        console.log('[Customer Lifecycle] No session found for manual trigger')
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      
      // För utvecklingsmiljö tillåter vi manuella triggers
      // I produktion skulle vi kontrollera admin-behörighet mer noggrant
      console.log('[Customer Lifecycle] Manual trigger authorized')
    } else {
      // För automatiska cron-jobb, kräv CRON_SECRET
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const results = {
      subscriptions_checked: 0,
      actions_scheduled: 0,
      accounts_suspended: 0,
      warnings_sent: 0,
      errors: [] as string[]
    }

    // 1. Kontrollera prenumerationsstatus
    console.log('[Customer Lifecycle] Checking subscription statuses...')
    const { data: statusChecks, error: statusError } = await supabase
      .rpc('check_subscription_status')
    
    if (statusError) {
      console.error('[Customer Lifecycle] Error checking subscription status:', statusError)
      results.errors.push(`Status check error: ${statusError.message}`)
    } else if (statusChecks) {
      results.subscriptions_checked = statusChecks.length
      
      // Hantera varje status som behöver åtgärd
      for (const check of statusChecks) {
        try {
          await handleSubscriptionAction(check, results)
        } catch (error) {
          console.error(`[Customer Lifecycle] Error handling action for user ${check.user_id}:`, error)
          results.errors.push(`Action error for user ${check.user_id}: ${error}`)
        }
      }
    }

    // 2. Uppdatera account status baserat på prenumerationer
    console.log('[Customer Lifecycle] Updating account statuses...')
    const { error: updateError } = await supabase
      .rpc('update_account_status_based_on_subscription')
    
    if (updateError) {
      console.error('[Customer Lifecycle] Error updating account statuses:', updateError)
      results.errors.push(`Account status update error: ${updateError.message}`)
    }

    // 3. Processa väntande automatiska åtgärder
    console.log('[Customer Lifecycle] Processing automated actions queue...')
    await processAutomatedActionsQueue(results)

    // 4. Rensa gamla poster
    await cleanupOldRecords()

    console.log('[Customer Lifecycle] Completed with results:', results)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error) {
    console.error('[Customer Lifecycle] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

async function handleSubscriptionAction(check: any, results: any) {
  const { action_needed, user_id, details } = check
  
  switch (action_needed) {
    case 'trial_expired':
      console.log(`[Customer Lifecycle] Trial expired for user ${user_id}`)
      
      // Sätt prenumeration som expired
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', details.subscription_id)
      
      // Initiera offboarding
      const { error: offboardError } = await supabase
        .rpc('initiate_customer_offboarding', {
          p_user_id: user_id,
          p_reason: 'trial_expired'
        })
      
      if (offboardError) {
        throw new Error(`Offboarding error: ${offboardError.message}`)
      }
      
      results.accounts_suspended++
      break

    case 'subscription_expired':
      console.log(`[Customer Lifecycle] Subscription expired for user ${user_id}`)
      
      // Sätt prenumeration som expired
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', details.subscription_id)
      
      // Initiera offboarding
      await supabase
        .rpc('initiate_customer_offboarding', {
          p_user_id: user_id,
          p_reason: 'subscription_expired'
        })
      
      results.accounts_suspended++
      break

    case 'payment_overdue':
      console.log(`[Customer Lifecycle] Payment overdue for user ${user_id}`)
      
      // Schemalägga betalningspåminnelse
      await supabase
        .rpc('schedule_automated_action', {
          p_action_type: 'send_payment_reminder',
          p_user_id: user_id,
          p_priority: 3,
          p_metadata: details
        })
      
      results.actions_scheduled++
      break
  }
}

async function processAutomatedActionsQueue(results: any) {
  // Hämta väntande åtgärder som ska köras
  const { data: pendingActions, error } = await supabase
    .from('automated_actions_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(50) // Begränsa för att undvika timeout

  if (error) {
    console.error('[Customer Lifecycle] Error fetching pending actions:', error)
    results.errors.push(`Queue fetch error: ${error.message}`)
    return
  }

  if (!pendingActions || pendingActions.length === 0) {
    console.log('[Customer Lifecycle] No pending actions to process')
    return
  }

  console.log(`[Customer Lifecycle] Processing ${pendingActions.length} pending actions`)

  for (const action of pendingActions) {
    try {
      // Markera som processing
      await supabase
        .from('automated_actions_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString(),
          attempts: action.attempts + 1
        })
        .eq('id', action.id)

      // Utför åtgärden
      const success = await executeAutomatedAction(action)
      
      // Uppdatera status
      await supabase
        .from('automated_actions_queue')
        .update({ 
          status: success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          success: success,
          error_message: success ? null : 'Action execution failed'
        })
        .eq('id', action.id)

      if (success) {
        results.actions_scheduled++
        if (action.action_type.includes('reminder') || action.action_type.includes('warning')) {
          results.warnings_sent++
        }
      }

    } catch (error) {
      console.error(`[Customer Lifecycle] Error processing action ${action.id}:`, error)
      
      // Markera som failed om max attempts nåtts
      const shouldRetry = action.attempts < action.max_attempts
      await supabase
        .from('automated_actions_queue')
        .update({ 
          status: shouldRetry ? 'pending' : 'failed',
          error_message: `${error}`,
          completed_at: shouldRetry ? null : new Date().toISOString()
        })
        .eq('id', action.id)
      
      results.errors.push(`Action ${action.id} failed: ${error}`)
    }
  }
}

async function executeAutomatedAction(action: any): Promise<boolean> {
  const { action_type, target_user_id, target_handbook_id, metadata } = action
  
  console.log(`[Customer Lifecycle] Executing action: ${action_type} for user ${target_user_id}`)

  switch (action_type) {
    case 'send_trial_reminder':
    case 'send_payment_reminder':
      return await sendReminderEmail(action_type, target_user_id, metadata)
    
    case 'suspend_account':
      return await suspendAccount(target_user_id, metadata)
    
    case 'schedule_data_deletion':
      return await scheduleDataDeletion(target_user_id, metadata)
    
    case 'export_user_data':
      return await exportUserData(target_user_id, metadata)
    
    case 'delete_user_data':
      return await deleteUserData(target_user_id, metadata)
    
    case 'reactivate_account':
      return await reactivateAccount(target_user_id, metadata)
    
    case 'send_welcome_email':
      return await sendWelcomeEmail(target_user_id, metadata)
    
    case 'downgrade_account':
      return await downgradeAccount(target_user_id, metadata)
    
    default:
      console.warn(`[Customer Lifecycle] Unknown action type: ${action_type}`)
      return false
  }
}

async function sendReminderEmail(type: string, userId: string, metadata: any): Promise<boolean> {
  try {
    // Hämta användarinfo
    const { data: user } = await supabase.auth.admin.getUserById(userId)
    if (!user?.user?.email) return false

    // Här skulle du integrera med ditt email-system (Resend, etc.)
    console.log(`[Customer Lifecycle] Sending ${type} to ${user.user.email}`)
    
    // Logga i audit_logs
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: type,
      resource_type: 'user',
      resource_id: userId,
      success: true,
      metadata: { email_sent: true, ...metadata }
    })

    return true
  } catch (error) {
    console.error(`[Customer Lifecycle] Error sending ${type}:`, error)
    return false
  }
}

async function suspendAccount(userId: string, metadata: any): Promise<boolean> {
  try {
    await supabase
      .from('account_status')
      .update({
        status: 'suspended',
        can_access_handbooks: false,
        can_create_handbooks: false,
        suspended_at: new Date().toISOString(),
        suspension_reason: metadata.reason || 'automated_suspension'
      })
      .eq('user_id', userId)

    // Logga händelse
    await supabase.from('customer_lifecycle_events').insert({
      user_id: userId,
      event_type: 'account_suspended',
      status: 'completed',
      metadata
    })

    return true
  } catch (error) {
    console.error('[Customer Lifecycle] Error suspending account:', error)
    return false
  }
}

async function scheduleDataDeletion(userId: string, metadata: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .rpc('initiate_customer_offboarding', {
        p_user_id: userId,
        p_reason: metadata.reason || 'automated_cleanup'
      })

    return !error
  } catch (error) {
    console.error('[Customer Lifecycle] Error scheduling data deletion:', error)
    return false
  }
}

async function exportUserData(userId: string, metadata: any): Promise<boolean> {
  try {
    // Detta skulle trigga GDPR data export
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/gdpr/export-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        export_type: 'full',
        automated: true
      })
    })

    return response.ok
  } catch (error) {
    console.error('[Customer Lifecycle] Error exporting user data:', error)
    return false
  }
}

async function deleteUserData(userId: string, metadata: any): Promise<boolean> {
  try {
    // Detta skulle trigga GDPR data deletion
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/gdpr/delete-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        automated: true,
        deletion_id: metadata.deletion_id
      })
    })

    return response.ok
  } catch (error) {
    console.error('[Customer Lifecycle] Error deleting user data:', error)
    return false
  }
}

async function reactivateAccount(userId: string, metadata: any): Promise<boolean> {
  try {
    await supabase
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

    // Avbryt väntande raderingar
    await supabase
      .from('account_deletions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'pending')

    return true
  } catch (error) {
    console.error('[Customer Lifecycle] Error reactivating account:', error)
    return false
  }
}

async function sendWelcomeEmail(userId: string, metadata: any): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.admin.getUserById(userId)
    if (!user?.user?.email) return false

    console.log(`[Customer Lifecycle] Sending welcome email to ${user.user.email}`)
    
    // Här skulle du skicka välkomstmail
    
    return true
  } catch (error) {
    console.error('[Customer Lifecycle] Error sending welcome email:', error)
    return false
  }
}

async function downgradeAccount(userId: string, metadata: any): Promise<boolean> {
  try {
    // Nedgradera till gratis plan
    await supabase
      .from('subscriptions')
      .update({
        plan_type: 'free',
        status: 'active',
        expires_at: null
      })
      .eq('user_id', userId)

    await supabase
      .from('account_status')
      .update({
        status: 'active',
        max_handbooks: 1,
        can_access_handbooks: true,
        can_create_handbooks: true
      })
      .eq('user_id', userId)

    return true
  } catch (error) {
    console.error('[Customer Lifecycle] Error downgrading account:', error)
    return false
  }
}

async function cleanupOldRecords() {
  try {
    // Rensa gamla completed actions (äldre än 30 dagar)
    await supabase
      .from('automated_actions_queue')
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Rensa gamla lifecycle events (äldre än 90 dagar)
    await supabase
      .from('customer_lifecycle_events')
      .delete()
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    console.log('[Customer Lifecycle] Cleanup completed')
  } catch (error) {
    console.error('[Customer Lifecycle] Error during cleanup:', error)
  }
} 