import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [Cron] Starting simplified orphaned trials fix job...');
    
    const supabase = getServiceSupabase();
    
    // ENDAST hitta handböcker som har en specifik aktiv prenumeration men fortfarande är i trial
    // Detta är den enda situationen som verkligen är "fel"
    const { data: activeSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        user_id,
        handbook_id,
        status,
        plan_type,
        created_at
      `)
      .eq('status', 'active')
      .not('handbook_id', 'is', null); // Endast prenumerationer för specifika handböcker

    if (subError) {
      throw new Error(`Error fetching active subscriptions: ${subError.message}`);
    }

    console.log(`📊 [Cron] Found ${activeSubscriptions?.length || 0} active handbook-specific subscriptions`);

    let fixedCount = 0;
    let checkedCount = 0;

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      for (const subscription of activeSubscriptions) {
        try {
          checkedCount++;
          
          // Kolla om handboken fortfarande är i trial-läge trots att den har en aktiv prenumeration
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

          // Om handboken har trial_end_date (inte null) men det finns en aktiv prenumeration för den
          if (handbook.trial_end_date !== null) {
            console.log(`🔧 [Cron] Found truly orphaned trial: ${handbook.title} (${handbook.id}) has active subscription but still in trial`);
            
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
                    fixed_by: 'simplified_cron_job',
                    original_trial_end_date: handbook.trial_end_date,
                    reason: 'handbook_has_active_subscription_but_still_trial'
                  }
                });
            }
          }
        } catch (error) {
          console.error(`❌ [Cron] Error processing subscription ${subscription.handbook_id}:`, error);
        }
      }
    }

    const result = {
      success: true,
      message: 'Simplified orphaned trials fix job completed',
      explanation: 'Only fixes handbooks that have active subscriptions but are still marked as trial',
      stats: {
        checkedSubscriptions: checkedCount,
        fixedHandbooks: fixedCount
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [Cron] Simplified orphaned trials fix completed:`, result);

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