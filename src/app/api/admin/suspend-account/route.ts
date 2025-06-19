import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId, reason } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceSupabase();
    
    console.log(`[Admin] Suspending account for user ${userId}`);
    
    // 1. Uppdatera account status
    const { error: statusError } = await supabase
      .from('account_status')
      .upsert({
        user_id: userId,
        status: 'suspended',
        can_access_handbooks: false,
        can_create_handbooks: false,
        can_edit_content: false,
        suspension_reason: reason || 'admin_suspended',
        suspended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          suspended_by: 'admin',
          suspension_reason: reason || 'admin_suspended',
          suspension_date: new Date().toISOString()
        }
      }, { onConflict: 'user_id' });
    
    if (statusError) {
      console.error('[Admin] Error updating account status:', statusError);
      throw statusError;
    }
    
    // 2. Sätt alla aktiva subscriptions som suspended
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (subError) {
      console.error('[Admin] Error suspending subscriptions:', subError);
      // Fortsätt även om subscription-uppdatering misslyckas
    }
    
    // 3. Logga lifecycle event
    const { error: eventError } = await supabase
      .from('customer_lifecycle_events')
      .insert({
        user_id: userId,
        event_type: 'account_suspended',
        status: 'completed',
        automated_action: 'admin_suspension',
        action_completed_at: new Date().toISOString(),
        metadata: {
          suspended_by: 'admin',
          suspension_reason: reason || 'admin_suspended',
          suspension_date: new Date().toISOString()
        }
      });
    
    if (eventError) {
      console.error('[Admin] Error logging lifecycle event:', eventError);
      // Inte kritiskt
    }
    
    console.log(`[Admin] Account ${userId} suspended successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Account suspended successfully',
      data: {
        userId,
        suspendedAt: new Date().toISOString(),
        reason: reason || 'admin_suspended'
      }
    });
    
  } catch (error) {
    console.error('[Admin] Error suspending account:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to suspend account' 
      },
      { status: 500 }
    );
  }
} 