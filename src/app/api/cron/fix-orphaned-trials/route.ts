import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [Cron] Starting orphaned trials fix job...');
    
    const supabase = getServiceSupabase();
    
    // Hitta användare som har aktiva prenumerationer men handböcker fortfarande i trial
    const { data: activeSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        user_id,
        handbook_id,
        status,
        plan_type,
        created_at,
        stripe_subscription_id
      `)
      .eq('status', 'active')
      .not('handbook_id', 'is', null);

    if (subError) {
      throw new Error(`Error fetching active subscriptions: ${subError.message}`);
    }

    console.log(`📊 [Cron] Found ${activeSubscriptions?.length || 0} active subscriptions with handbook_id`);

    let fixedCount = 0;
    let checkedCount = 0;

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      for (const subscription of activeSubscriptions) {
        try {
          checkedCount++;
          
          // Kolla om handboken fortfarande är i trial-läge
          const { data: handbook, error: handbookError } = await supabase
            .from('handbooks')
            .select('id, title, trial_end_date, owner_id')
            .eq('id', subscription.handbook_id)
            .single();

          if (handbookError) {
            console.error(`❌ [Cron] Error fetching handbook ${subscription.handbook_id}:`, handbookError);
            continue;
          }

          if (!handbook) {
            console.log(`⚠️ [Cron] Handbook ${subscription.handbook_id} not found`);
            continue;
          }

          // Om handboken har trial_end_date (inte null) men användaren har aktiv prenumeration
          if (handbook.trial_end_date !== null) {
            console.log(`🔧 [Cron] Found orphaned trial: ${handbook.title} (${handbook.id}) should be paid`);
            
            // Uppdatera handboken till betald status
            const { error: updateError } = await supabase
              .from('handbooks')
              .update({
                trial_end_date: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', handbook.id);

            if (updateError) {
              console.error(`❌ [Cron] Error updating handbook ${handbook.id}:`, updateError);
            } else {
              fixedCount++;
              console.log(`✅ [Cron] Fixed orphaned trial: ${handbook.title} (${handbook.id})`);
              
              // Logga händelsen
              await supabase
                .from('customer_lifecycle_events')
                .insert({
                  user_id: subscription.user_id,
                  subscription_id: subscription.handbook_id,
                  event_type: 'trial_fixed',
                  status: 'completed',
                  automated_action: 'orphaned_trial_fixed',
                  action_completed_at: new Date().toISOString(),
                  metadata: {
                    handbook_id: handbook.id,
                    handbook_title: handbook.title,
                    subscription_plan: subscription.plan_type,
                    fixed_by: 'cron_job',
                    original_trial_end_date: handbook.trial_end_date
                  }
                });
            }
          }
        } catch (error) {
          console.error(`❌ [Cron] Error processing subscription ${subscription.handbook_id}:`, error);
        }
      }
    }

    // Hitta också användare med aktiva prenumerationer men INGA specifika handböcker
    const { data: generalSubscriptions, error: generalError } = await supabase
      .from('subscriptions')
      .select(`
        user_id,
        status,
        plan_type,
        created_at
      `)
      .eq('status', 'active')
      .is('handbook_id', null);

    if (generalError) {
      console.error(`❌ [Cron] Error fetching general subscriptions:`, generalError);
    } else if (generalSubscriptions && generalSubscriptions.length > 0) {
      console.log(`📊 [Cron] Found ${generalSubscriptions.length} general active subscriptions`);
      
      for (const subscription of generalSubscriptions) {
        try {
          // Hitta alla trial-handböcker för denna användare
          const { data: trialHandbooks, error: trialError } = await supabase
            .from('handbooks')
            .select('id, title, trial_end_date')
            .eq('owner_id', subscription.user_id)
            .not('trial_end_date', 'is', null);

          if (trialError) {
            console.error(`❌ [Cron] Error fetching trial handbooks for user ${subscription.user_id}:`, trialError);
            continue;
          }

          if (trialHandbooks && trialHandbooks.length > 0) {
            console.log(`🔧 [Cron] User ${subscription.user_id} has general subscription but ${trialHandbooks.length} trial handbooks`);
            
            for (const handbook of trialHandbooks) {
              const { error: updateError } = await supabase
                .from('handbooks')
                .update({
                  trial_end_date: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', handbook.id);

              if (updateError) {
                console.error(`❌ [Cron] Error updating handbook ${handbook.id}:`, updateError);
              } else {
                fixedCount++;
                console.log(`✅ [Cron] Fixed general subscription handbook: ${handbook.title} (${handbook.id})`);
              }
            }
          }
        } catch (error) {
          console.error(`❌ [Cron] Error processing general subscription for user ${subscription.user_id}:`, error);
        }
      }
    }

    const result = {
      success: true,
      message: 'Orphaned trials fix job completed',
      stats: {
        checkedSubscriptions: checkedCount,
        fixedHandbooks: fixedCount,
        generalSubscriptions: generalSubscriptions?.length || 0
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [Cron] Orphaned trials fix completed:`, result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [Cron] Error in orphaned trials fix job:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Tillåt manuell körning via POST också
export async function POST(request: NextRequest) {
  return GET(request);
} 