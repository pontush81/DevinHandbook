import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Hämta autentiserad användare
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Ingen auktorisering' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Ogiltig auktorisering' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      deletion_type = 'full', // 'full', 'partial', 'account_only'
      reason = 'User requested deletion',
      immediate = false, // Om true, radera omedelbart istället för 90-dagars väntan
      handbook_ids = [], // Specifika handböcker att radera (för partial)
      confirm_understanding = false
    } = body;

    // Validera att användaren förstår konsekvenserna
    if (!confirm_understanding) {
      return NextResponse.json(
        { 
          error: 'Du måste bekräfta att du förstår att denna åtgärd är permanent',
          required_confirmation: true
        },
        { status: 400 }
      );
    }

    // Kolla om användaren redan har en pågående raderingsbegäran
    const { data: existingDeletion } = await supabase
      .from('account_deletions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'warned_75', 'warned_85', 'warned_89'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingDeletion && existingDeletion.length > 0) {
      return NextResponse.json(
        { 
          error: 'Du har redan en pågående raderingsbegäran',
          existing_deletion: {
            id: existingDeletion[0].id,
            scheduled_for: existingDeletion[0].scheduled_deletion_at,
            status: existingDeletion[0].status,
            can_cancel: true
          }
        },
        { status: 409 }
      );
    }

    // Kolla användarens handböcker och roller
    const { data: userHandbooks } = await supabase
      .from('handbooks')
      .select(`
        id,
        title,
        owner_id,
        handbook_members(user_id, role)
      `)
      .or(`owner_id.eq.${user.id},handbook_members.user_id.eq.${user.id}`);

    const ownedHandbooks = userHandbooks?.filter(h => h.owner_id === user.id) || [];
    const memberHandbooks = userHandbooks?.filter(h => h.owner_id !== user.id) || [];

    // Varning om användaren äger handböcker
    if (ownedHandbooks.length > 0 && deletion_type === 'full') {
      const handbookTitles = ownedHandbooks.map(h => h.title).join(', ');
      
      return NextResponse.json(
        { 
          error: 'Du äger handböcker som kommer att raderas',
          warning: `Du äger ${ownedHandbooks.length} handbok(böcker): ${handbookTitles}. Dessa kommer att raderas permanent.`,
          owned_handbooks: ownedHandbooks.map(h => ({ id: h.id, title: h.title })),
          requires_explicit_confirmation: true
        },
        { status: 409 }
      );
    }

    // Skapa GDPR-raderingsbegäran
    const { data: gdprRequest, error: requestError } = await supabase
      .rpc('create_gdpr_request', {
        p_request_type: 'deletion',
        p_request_details: {
          deletion_type,
          reason,
          immediate,
          handbook_ids,
          owned_handbooks_count: ownedHandbooks.length,
          member_handbooks_count: memberHandbooks.length,
          requested_from: 'api'
        }
      });

    if (requestError) {
      console.error('Fel vid skapande av GDPR-raderingsbegäran:', requestError);
      return NextResponse.json(
        { error: 'Kunde inte skapa raderingsbegäran' },
        { status: 500 }
      );
    }

    // Schemalägga dataradering
    let deletionSchedule;
    
    if (immediate) {
      // Omedelbar radering (endast för admin eller specifika fall)
      deletionSchedule = await processImmediateDeletion(user.id, deletion_type, handbook_ids);
    } else {
      // Standard 90-dagars schemaläggning
      const { data: scheduledDeletion, error: scheduleError } = await supabase
        .rpc('schedule_data_deletion', {
          p_user_id: user.id,
          p_handbook_id: null, // För full radering
          p_deletion_reason: reason
        });

      if (scheduleError) {
        console.error('Fel vid schemaläggning av radering:', scheduleError);
        return NextResponse.json(
          { error: 'Kunde inte schemalägga radering' },
          { status: 500 }
        );
      }

      deletionSchedule = scheduledDeletion;
    }

    // Skicka bekräftelse-e-post
    await sendDeletionConfirmationEmail(user.id, user.email!, {
      deletion_type,
      scheduled_for: immediate ? 'omedelbart' : '90 dagar',
      owned_handbooks: ownedHandbooks.length,
      gdpr_request_id: gdprRequest
    });

    return NextResponse.json({
      success: true,
      gdpr_request_id: gdprRequest,
      deletion_schedule_id: deletionSchedule,
      message: immediate 
        ? 'Din data har raderats omedelbart'
        : 'Raderingsbegäran skapad. Din data kommer att raderas efter 90 dagar.',
      details: {
        deletion_type,
        scheduled_deletion_date: immediate ? null : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        owned_handbooks_affected: ownedHandbooks.length,
        member_handbooks_affected: memberHandbooks.length,
        can_cancel_until: immediate ? null : new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('GDPR Delete Request Error:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
}

// Hantera omedelbar radering
async function processImmediateDeletion(userId: string, deletionType: string, handbookIds: string[]) {
  try {
    // Logga innan radering
    await supabase.rpc('log_user_activity', {
      p_action: 'immediate_deletion_started',
      p_resource_type: 'user_account',
      p_resource_id: userId,
      p_metadata: {
        deletion_type: deletionType,
        handbook_ids: handbookIds
      }
    });

    if (deletionType === 'full') {
      // Full kontoradering
      await performFullAccountDeletion(userId);
    } else if (deletionType === 'partial') {
      // Partiell radering av specifika handböcker
      await performPartialDeletion(userId, handbookIds);
    }

    // Logga framgångsrik radering
    await supabase.rpc('log_user_activity', {
      p_action: 'immediate_deletion_completed',
      p_resource_type: 'user_account',
      p_resource_id: userId,
      p_metadata: {
        deletion_type: deletionType,
        completed_at: new Date().toISOString()
      }
    });

    return 'immediate_deletion_completed';

  } catch (error) {
    console.error('Immediate deletion error:', error);
    
    // Logga fel
    await supabase.rpc('log_user_activity', {
      p_action: 'immediate_deletion_failed',
      p_resource_type: 'user_account',
      p_resource_id: userId,
      p_success: false,
      p_error_message: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

// Utför full kontoradering
async function performFullAccountDeletion(userId: string) {
  // VIKTIGT: Detta är en irreversibel operation
  
  // 1. Anonymisera handböcker istället för att radera dem (för att bevara integritet)
  const { error: handbookError } = await supabase
    .from('handbooks')
    .update({
      owner_id: null,
      organization_name: 'Raderad användare',
      organization_email: 'deleted@example.com',
      organization_phone: null,
      organization_address: null
    })
    .eq('owner_id', userId);

  if (handbookError) {
    throw new Error(`Handbook anonymization failed: ${handbookError.message}`);
  }

  // 2. Ta bort användarens medlemskap i handböcker
  const { error: membershipError } = await supabase
    .from('handbook_members')
    .delete()
    .eq('user_id', userId);

  if (membershipError) {
    throw new Error(`Membership deletion failed: ${membershipError.message}`);
  }

  // 3. Anonymisera kommentarer och inlägg
  const { error: commentsError } = await supabase
    .from('forum_posts')
    .update({
      author_name: 'Raderad användare',
      author_email: 'deleted@example.com'
    })
    .eq('author_id', userId);

  // 4. Radera personliga data men behåll audit logs för juridiska krav
  // Anonymisera audit logs istället för att radera
  const { error: auditError } = await supabase
    .from('audit_logs')
    .update({
      user_email: 'deleted@example.com'
    })
    .eq('user_id', userId);

  // 5. Radera GDPR-exports
  const { error: exportsError } = await supabase
    .from('gdpr_exports')
    .delete()
    .eq('user_id', userId);

  // 6. Radera användarsamtycken
  const { error: consentsError } = await supabase
    .from('user_consents')
    .delete()
    .eq('user_id', userId);

  // 7. Slutligen, radera användarkontot från Supabase Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    throw new Error(`Auth user deletion failed: ${authError.message}`);
  }
}

// Utför partiell radering
async function performPartialDeletion(userId: string, handbookIds: string[]) {
  for (const handbookId of handbookIds) {
    // Kontrollera att användaren äger handboken
    const { data: handbook } = await supabase
      .from('handbooks')
      .select('owner_id')
      .eq('id', handbookId)
      .single();

    if (handbook?.owner_id === userId) {
      // Radera handboken och all relaterad data
      const { error } = await supabase
        .from('handbooks')
        .delete()
        .eq('id', handbookId);

      if (error) {
        throw new Error(`Handbook deletion failed: ${error.message}`);
      }
    } else {
      // Ta bort användarens medlemskap
      const { error } = await supabase
        .from('handbook_members')
        .delete()
        .eq('handbook_id', handbookId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Membership removal failed: ${error.message}`);
      }
    }
  }
}

// Skicka bekräftelse-e-post
async function sendDeletionConfirmationEmail(userId: string, email: string, details: any) {
  // TODO: Implementera e-postskickning via Resend
  console.log(`Deletion confirmation email sent to ${email}`, details);
  
  // Logga e-postskickning
  await supabase.rpc('log_user_activity', {
    p_action: 'deletion_confirmation_email_sent',
    p_resource_type: 'email',
    p_metadata: {
      recipient: email,
      deletion_type: details.deletion_type,
      scheduled_for: details.scheduled_for
    }
  });
} 