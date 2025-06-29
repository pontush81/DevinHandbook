import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getAdminClient } from '@/lib/supabase';
import { getHybridAuth, isHandbookAdmin } from '@/lib/standard-auth';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    // 1. Hämta och validera session med hybrid authentication
    console.log('🔐 [Invite Member] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Invite Member] Authentication failed - no userId found');
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }

    console.log('✅ [Invite Member] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });

    // 2. Parse request data
    const { handbookId, email, role = 'viewer' } = await request.json();

    // 2. Validera indata
    if (!handbookId || !email) {
      return NextResponse.json(
        { success: false, message: "handbook_id och email krävs" },
        { status: 400 }
      );
    }

    console.log('🔍 [Invite Member] Checking admin privileges for handbook:', handbookId);

    // 3. Kontrollera att användaren har admin-behörighet för handboken
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Invite Member] User lacks admin privileges');
      return NextResponse.json(
        { success: false, message: "Du har inte admin-behörighet för denna handbok" },
        { status: 403 }
      );
    }

    console.log('✅ [Invite Member] Admin privileges confirmed');

    // Use admin client for auth operations and service client for database operations
    const adminClient = getAdminClient();
    const supabase = getServiceSupabase();

    // 4. Kontrollera om användaren redan finns i systemet
    console.log('🔍 [Invite Member] Checking if user exists in system...');
    
    // Since getUserByEmail doesn't exist, we need to search through users
    let existingUser = null;
    let userError = null;
    
    try {
      // Get all users and search for the email
      // Note: This is not ideal for large user bases, but it's the only way with current Supabase admin API
      const { data: usersData, error: searchError } = await adminClient.auth.admin.listUsers();
      
      if (searchError) {
        userError = searchError;
        console.error('❌ [Invite Member] Error listing users:', searchError);
      } else if (usersData?.users) {
        // Find user by email
        const foundUser = usersData.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
        if (foundUser) {
          existingUser = { user: foundUser };
          console.log('✅ [Invite Member] User found in system:', foundUser.id);
        } else {
          console.log('ℹ️ [Invite Member] User not found in system');
        }
      }
    } catch (searchError) {
      console.error('❌ [Invite Member] Exception searching for user:', searchError);
      userError = searchError;
    }
    
    if (userError) {
      console.error('❌ [Invite Member] Error checking existing user:', userError);
      return NextResponse.json(
        { success: false, message: "Kunde inte kontrollera användarstatus" },
        { status: 500 }
      );
    }

    let targetUserId = existingUser?.user?.id;

    // 5. Om användaren inte finns, skapa en invitation
    if (!existingUser || !existingUser.user) {
      console.log('⚠️ [Invite Member] User not found, creating invitation...');
      // Skapa en invitation i databasen
      const { data: invitation, error: inviteError } = await supabase
        .from('handbook_invitations')
        .insert({
          handbook_id: handbookId,
          email: email.toLowerCase(),
          role,
          invited_by: authResult.userId,
          status: 'pending'
        })
        .select()
        .single();

      if (inviteError) {
        console.error('❌ [Invite Member] Error creating invitation:', inviteError);
        
        if (inviteError.code === '23505') { // Unique constraint violation
          return NextResponse.json(
            { success: false, message: "En inbjudan till denna e-postadress finns redan" },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { success: false, message: "Kunde inte skapa inbjudan" },
          { status: 500 }
        );
      }

      // Försök skicka inbjudan via e-post
      console.log('📧 [Invite Member] Sending email invitation...');
      try {
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: {
            handbook_id: handbookId,
            role,
            invitation_id: invitation.id
          }
        });
        console.log('✅ [Invite Member] Email invitation sent successfully');
      } catch (emailError) {
        console.error('⚠️ [Invite Member] Failed to send email invitation:', emailError);
        // Vi fortsätter även om e-post misslyckades
      }

      console.log('✅ [Invite Member] Invitation created successfully');
      return NextResponse.json({
        success: true,
        message: "Inbjudan skickad",
        type: "invitation"
      });
    }

    // 6. Användaren finns redan - lägg till direkt som medlem
    console.log('✅ [Invite Member] User exists, adding as member directly...');
    targetUserId = existingUser.user.id;

    // Kontrollera om användaren redan är medlem
    const { data: existingMember, error: memberError } = await supabase
      .from('handbook_members')
      .select('id, role')
      .eq('handbook_id', handbookId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (memberError) {
      console.error('❌ [Invite Member] Error checking existing member:', memberError);
      return NextResponse.json(
        { success: false, message: "Kunde inte kontrollera medlemsstatus" },
        { status: 500 }
      );
    }

    if (existingMember) {
      console.log('⚠️ [Invite Member] User is already a member');
      return NextResponse.json(
        { success: false, message: "Användaren är redan medlem i denna handbok" },
        { status: 400 }
      );
    }

    // Lägg till användaren som medlem
    const { error: addMemberError } = await supabase
      .from('handbook_members')
      .insert({
        handbook_id: handbookId,
        user_id: targetUserId,
        role
      });

    if (addMemberError) {
      console.error('❌ [Invite Member] Error adding member:', addMemberError);
      return NextResponse.json(
        { success: false, message: "Kunde inte lägga till medlem" },
        { status: 500 }
      );
    }

    console.log('✅ [Invite Member] Member added successfully');
    return NextResponse.json({
      success: true,
      message: "Medlem tillagd",
      type: "direct_add"
    });

  } catch (error) {
    console.error('❌ [Invite Member] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
}

// Helper-funktion för att skicka inbjudnings-e-post
async function sendInvitationEmail({
  email,
  handbookTitle,
  handbookSlug,
  handbookDescription,
  adminName,
  role,
  joinCode,
  isNewUser
}: {
  email: string;
  handbookTitle: string;
  handbookSlug: string;
  handbookDescription?: string;
  adminName: string;
  role: string;
  joinCode?: string;
  isNewUser: boolean;
}) {
  if (!resend) {
    console.warn('[Invite] Resend not available, skipping email invitation');
    return;
  }

  console.log('[Invite] Sending email to:', email);
  console.log('[Invite] Resend API Key available:', !!process.env.RESEND_API_KEY);
  console.log('[Invite] RESEND_DOMAIN:', process.env.RESEND_DOMAIN);

  const roleName = {
    admin: 'Administratör',
    editor: 'Redaktör', 
    viewer: 'Läsare'
  }[role] || role;

  const baseUrl = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
  let actionUrl: string;
  let actionText: string;
  let emailSubject: string;
  let mainContent: string;

  if (isNewUser && joinCode) {
    // Ny användare - dirigera till registrering med join-kod
    actionUrl = `${protocol}://${baseUrl}/signup?join=${joinCode}`;
    actionText = "Registrera dig och gå med";
    emailSubject = `Inbjudan till ${handbookTitle}`;
    mainContent = `
      <p><strong>${adminName}</strong> har bjudit in dig att gå med i <strong>${handbookTitle}</strong> som <strong>${roleName}</strong>.</p>
      ${handbookDescription ? `<p><em>${handbookDescription}</em></p>` : ''}
      <p>För att gå med behöver du först skapa ett konto på Handbok.org. Klicka på knappen nedan för att komma igång:</p>
    `;
  } else {
    // Befintlig användare - dirigera direkt till handboken
    actionUrl = `${protocol}://${baseUrl}/${handbookSlug}`;
    actionText = "Öppna handboken";
    emailSubject = `Välkommen till ${handbookTitle}`;
    mainContent = `
      <p><strong>${adminName}</strong> har lagt till dig som medlem i <strong>${handbookTitle}</strong> med rollen <strong>${roleName}</strong>.</p>
      ${handbookDescription ? `<p><em>${handbookDescription}</em></p>` : ''}
      <p>Du kan nu komma åt handboken genom att klicka på knappen nedan:</p>
    `;
  }

  const emailContent = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">📚 Handbok-inbjudan</h1>
      </div>
      <div style="padding: 20px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-top: 0;">${handbookTitle}</h2>
        ${mainContent}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${actionUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">${actionText}</a>
        </div>
        <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
          <p style="margin: 0;"><strong>Din roll: ${roleName}</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
            ${role === 'admin' ? 'Du kan redigera innehåll och hantera medlemmar.' : 
              role === 'editor' ? 'Du kan redigera innehåll i handboken.' : 
              'Du kan läsa och kommentera i handboken.'}
          </p>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">Du får detta e-postmeddelande eftersom ${adminName} har bjudit in dig till ${handbookTitle}.</p>
        <p style="margin: 5px 0 0 0;">Om du inte vill gå med kan du ignorera detta meddelande.</p>
      </div>
    </div>
  `;

  try {
    console.log('[Invite] About to send email via Resend...');
    
    // Use Resend's default domain for development if handbok.org is not verified
    const fromDomain = process.env.NODE_ENV === 'production' 
      ? process.env.RESEND_DOMAIN || 'yourdomain.com'
      : 'onboarding@resend.dev';
    
    const fromEmail = process.env.NODE_ENV === 'production'
      ? `${handbookTitle} <noreply@${fromDomain}>`
      : `${handbookTitle} <${fromDomain}>`;
    
    const replyToDomain = process.env.NODE_ENV === 'production'
      ? process.env.RESEND_DOMAIN || 'yourdomain.com' 
      : 'onboarding@resend.dev';
    
    console.log('[Invite] Using from email:', fromEmail);
    console.log('[Invite] Environment:', process.env.NODE_ENV);
    
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: emailSubject,
      html: emailContent,
      reply_to: process.env.NODE_ENV === 'production' 
        ? `no-reply@${replyToDomain}`
        : fromDomain,
      tags: [
        { name: 'type', value: 'handbook_invitation' },
        { name: 'handbook', value: handbookSlug },
        { name: 'role', value: role },
        { name: 'user_type', value: isNewUser ? 'new' : 'existing' }
      ]
    });

    console.log('[Invite] Resend response:', emailResult);
    
    if (emailResult.data) {
      console.log('[Invite] Email sent successfully! ID:', emailResult.data.id);
    } else {
      console.error('[Invite] No data in Resend response:', emailResult);
    }

    console.log('[Invite] Invitation email sent to:', email, 'for handbook:', handbookTitle);
  } catch (error) {
    console.error('[Invite] Failed to send invitation email to:', email);
    console.error('[Invite] Error details:', error);
    console.error('[Invite] Error message:', error instanceof Error ? error.message : 'Unknown error');
    // Vi kastar inte fel här för att inte stoppa hela processen
  }
}

// Helper-funktion för att skicka rolluppdatering-e-post
async function sendRoleUpdateEmail({
  email,
  handbookTitle,
  handbookSlug,
  adminName,
  oldRole,
  newRole
}: {
  email: string;
  handbookTitle: string;
  handbookSlug: string;
  adminName: string;
  oldRole: string;
  newRole: string;
}) {
  if (!resend) {
    console.warn('[Invite] Resend not available, skipping role update email');
    return;
  }

  const oldRoleName = {
    admin: 'Administratör',
    editor: 'Redaktör', 
    viewer: 'Läsare'
  }[oldRole] || oldRole;

  const newRoleName = {
    admin: 'Administratör',
    editor: 'Redaktör', 
    viewer: 'Läsare'
  }[newRole] || newRole;

  const baseUrl = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const handbookUrl = `${protocol}://${baseUrl}/${handbookSlug}`;

  const emailContent = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🔄 Roll uppdaterad</h1>
      </div>
      <div style="padding: 20px; background-color: #ffffff;">
        <h2 style="color: #10b981; margin-top: 0;">${handbookTitle}</h2>
        <p><strong>${adminName}</strong> har uppdaterat din roll i <strong>${handbookTitle}</strong>.</p>
        <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
          <p style="margin: 0;"><strong>Rollförändring:</strong></p>
          <p style="margin: 5px 0;">Från: <span style="color: #666;">${oldRoleName}</span></p>
          <p style="margin: 5px 0;">Till: <strong style="color: #10b981;">${newRoleName}</strong></p>
        </div>
        <p style="font-size: 14px; color: #666;">
          ${newRole === 'admin' ? 'Du kan nu redigera innehåll och hantera medlemmar.' : 
            newRole === 'editor' ? 'Du kan nu redigera innehåll i handboken.' : 
            'Du kan läsa och kommentera i handboken.'}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${handbookUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Öppna handboken</a>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">Detta e-postmeddelande skickades eftersom din roll i ${handbookTitle} har ändrats.</p>
      </div>
    </div>
  `;

  try {
    console.log('[Invite] About to send role update email via Resend...');
    
    // Use Resend's default domain for development if handbok.org is not verified
    const fromDomain = process.env.NODE_ENV === 'production' 
      ? process.env.RESEND_DOMAIN || 'yourdomain.com'
      : 'onboarding@resend.dev';
    
    const fromEmail = process.env.NODE_ENV === 'production'
      ? `${handbookTitle} <noreply@${fromDomain}>`
      : `${handbookTitle} <${fromDomain}>`;
    
    const replyToDomain = process.env.NODE_ENV === 'production'
      ? process.env.RESEND_DOMAIN || 'yourdomain.com' 
      : 'onboarding@resend.dev';
    
    console.log('[Invite] Role update using from email:', fromEmail);
    
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Din roll i ${handbookTitle} har uppdaterats`,
      html: emailContent,
      reply_to: process.env.NODE_ENV === 'production' 
        ? `no-reply@${replyToDomain}`
        : fromDomain,
      tags: [
        { name: 'type', value: 'role_update' },
        { name: 'handbook', value: handbookSlug },
        { name: 'old_role', value: oldRole },
        { name: 'new_role', value: newRole }
      ]
    });

    console.log('[Invite] Role update email Resend response:', emailResult);
    
    if (emailResult.data) {
      console.log('[Invite] Role update email sent successfully! ID:', emailResult.data.id);
    } else {
      console.error('[Invite] No data in role update Resend response:', emailResult);
    }

    console.log('[Invite] Role update email sent to:', email, 'for handbook:', handbookTitle);
  } catch (error) {
    console.error('[Invite] Failed to send role update email to:', email);
    console.error('[Invite] Role update error details:', error);
    console.error('[Invite] Role update error message:', error instanceof Error ? error.message : 'Unknown error');
  }
} 