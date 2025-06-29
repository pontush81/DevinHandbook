import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getHybridAuth, AUTH_RESPONSES } from '@/lib/standard-auth';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Helper-funktion för att skicka email när admin lägger till användare
async function sendAdminAddedEmail({
  email,
  handbookTitle,
  handbookSlug,
  adminName,
  role
}: {
  email: string;
  handbookTitle: string;
  handbookSlug: string;
  adminName: string;
  role: string;
}) {
  if (!resend) {
    console.warn('[Admin Add] Resend not available, skipping email notification');
    return;
  }

  const roleName = {
    admin: 'Administratör',
    editor: 'Redaktör', 
    viewer: 'Läsare'
  }[role] || role;

  const baseUrl = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const handbookUrl = `${protocol}://${baseUrl}/${handbookSlug}`;

  const emailContent = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">📚 Du har lagts till i en handbok</h1>
      </div>
      <div style="padding: 20px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-top: 0;">${handbookTitle}</h2>
        <p><strong>${adminName}</strong> har lagt till dig som medlem i <strong>${handbookTitle}</strong> med rollen <strong>${roleName}</strong>.</p>
        <p>Du kan nu komma åt handboken genom att klicka på knappen nedan:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${handbookUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Öppna handboken</a>
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
        <p style="margin: 0;">Du får detta e-postmeddelande eftersom ${adminName} har lagt till dig i ${handbookTitle}.</p>
        <p style="margin: 5px 0 0 0;">Om du har frågor kan du kontakta handbokens administratör.</p>
      </div>
    </div>
  `;

  try {
    console.log('[Admin Add] About to send email via Resend...');
    
    // I development, bara skicka till verifierade email-adresser
    if (process.env.NODE_ENV !== 'production' && email !== 'pontus.hberg@gmail.com') {
      console.log('[Admin Add] Development mode: Skipping email to', email, '(only sending to verified addresses)');
      console.log('[Admin Add] Notification email would have been sent to:', email, 'for handbook:', handbookTitle);
      return;
    }
    
    const fromDomain = process.env.NODE_ENV === 'production' 
      ? process.env.RESEND_DOMAIN || 'yourdomain.com'
      : 'onboarding@resend.dev';
    
    const fromEmail = process.env.NODE_ENV === 'production'
      ? `${handbookTitle} <noreply@${fromDomain}>`
      : `${handbookTitle} <${fromDomain}>`;
    
    const replyToDomain = process.env.NODE_ENV === 'production'
      ? process.env.RESEND_DOMAIN || 'yourdomain.com' 
      : 'onboarding@resend.dev';
    
    console.log('[Admin Add] Using from email:', fromEmail);
    
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Du har lagts till i ${handbookTitle}`,
      html: emailContent,
      reply_to: process.env.NODE_ENV === 'production' 
        ? `no-reply@${replyToDomain}`
        : fromDomain,
      tags: [
        { name: 'type', value: 'admin_added_user' },
        { name: 'handbook', value: handbookSlug },
        { name: 'role', value: role }
      ]
    });

    console.log('[Admin Add] Resend response:', emailResult);
    
    if (emailResult.data) {
      console.log('[Admin Add] Email sent successfully! ID:', emailResult.data.id);
    } else {
      console.error('[Admin Add] No data in Resend response:', emailResult);
    }

    console.log('[Admin Add] Notification email sent to:', email, 'for handbook:', handbookTitle);
  } catch (error) {
    console.error('[Admin Add] Failed to send notification email to:', email);
    console.error('[Admin Add] Error details:', error);
    console.error('[Admin Add] Error message:', error instanceof Error ? error.message : 'Unknown error');
    // Vi kastar inte fel här för att inte stoppa hela processen
  }
}

// Helper-funktion för att skicka email när admin uppdaterar användares roll
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
    console.warn('[Role Update] Resend not available, skipping email notification');
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
        <h1 style="margin: 0; font-size: 24px;">🔄 Din roll har uppdaterats</h1>
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
        <p style="margin: 0;">Detta e-postmeddelande skickades eftersom din roll i ${handbookTitle} har ändrats av ${adminName}.</p>
      </div>
    </div>
  `;

  try {
    console.log('[Role Update] About to send email via Resend...');
    
    // I development, bara skicka till verifierade email-adresser
    if (process.env.NODE_ENV !== 'production' && email !== 'pontus.hberg@gmail.com') {
      console.log('[Role Update] Development mode: Skipping email to', email, '(only sending to verified addresses)');
      console.log('[Role Update] Role update email would have been sent to:', email, 'for handbook:', handbookTitle);
      return;
    }
    
    const fromDomain = process.env.NODE_ENV === 'production' 
      ? process.env.RESEND_DOMAIN || 'yourdomain.com'
      : 'onboarding@resend.dev';
    
    const fromEmail = process.env.NODE_ENV === 'production'
      ? `${handbookTitle} <noreply@${fromDomain}>`
      : `${handbookTitle} <${fromDomain}>`;
    
    const replyToDomain = process.env.NODE_ENV === 'production'
      ? process.env.RESEND_DOMAIN || 'yourdomain.com' 
      : 'onboarding@resend.dev';
    
    console.log('[Role Update] Using from email:', fromEmail);
    
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Din roll i ${handbookTitle} har uppdaterats`,
      html: emailContent,
      reply_to: process.env.NODE_ENV === 'production' 
        ? `no-reply@${replyToDomain}`
        : fromDomain,
      tags: [
        { name: 'type', value: 'admin_role_update' },
        { name: 'handbook', value: handbookSlug },
        { name: 'old_role', value: oldRole },
        { name: 'new_role', value: newRole }
      ]
    });

    console.log('[Role Update] Resend response:', emailResult);
    
    if (emailResult.data) {
      console.log('[Role Update] Email sent successfully! ID:', emailResult.data.id);
    } else {
      console.error('[Role Update] No data in Resend response:', emailResult);
    }

    console.log('[Role Update] Role update email sent to:', email, 'for handbook:', handbookTitle);
  } catch (error) {
    console.error('[Role Update] Failed to send role update email to:', email);
    console.error('[Role Update] Error details:', error);
    console.error('[Role Update] Error message:', error instanceof Error ? error.message : 'Unknown error');
    // Vi kastar inte fel här för att inte stoppa hela processen
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 1. Hämta och validera session
    const authResult = await getHybridAuth(request);
    if (!authResult.userId) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // 2. Kontrollera att användaren är superadmin
    const supabase = getServiceSupabase();
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', authResult.userId)
      .maybeSingle();

    if (profileError || !profile?.is_superadmin) {
      return NextResponse.json(
        { success: false, message: "Du har inte superadmin-behörighet" },
        { status: 403 }
      );
    }

    // 3. Validera indata
    const { userId, handbookId, role } = await request.json();
    
    if (!userId || !handbookId || !role) {
      return NextResponse.json(
        { success: false, message: "Ofullständiga uppgifter" },
        { status: 400 }
      );
    }

    if (!["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Ogiltig roll" },
        { status: 400 }
      );
    }

    // 4. Kontrollera att handboken finns
    const { data: handbook, error: handbookError } = await supabase
      .from("handbooks")
      .select("id, title, slug")
      .eq("id", handbookId)
      .maybeSingle();

    if (handbookError || !handbook) {
      return NextResponse.json(
        { success: false, message: "Handboken hittades inte" },
        { status: 404 }
      );
    }

    // 5. Hämta admin-användarens namn
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', authResult.userId)
      .maybeSingle();

    const adminName = adminProfile?.first_name && adminProfile?.last_name 
      ? `${adminProfile.first_name} ${adminProfile.last_name}`
      : authResult.userEmail || 'En administratör';

    // 6. Kontrollera att användaren finns
    const { data: targetUser, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !targetUser) {
      return NextResponse.json(
        { success: false, message: "Användaren hittades inte" },
        { status: 404 }
      );
    }

    // 7. Kontrollera om användaren redan är medlem
    const { data: existingMember, error: memberError } = await supabase
      .from("handbook_members")
      .select("id, role")
      .eq("handbook_id", handbookId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) {
      console.error("Fel vid kontroll av medlemskap:", memberError);
      return NextResponse.json(
        { success: false, message: "Kunde inte kontrollera medlemskap" },
        { status: 500 }
      );
    }

    if (existingMember) {
      // 8. Uppdatera befintlig medlems roll
      const { error: updateError } = await supabase
        .from("handbook_members")
        .update({ role })
        .eq("id", existingMember.id);

      if (updateError) {
        console.error("Fel vid uppdatering av roll:", updateError);
        return NextResponse.json(
          { success: false, message: "Kunde inte uppdatera användarens roll" },
          { status: 500 }
        );
      }

      // 9. Skicka email när användarens roll uppdateras (bara om rollen ändras)
      if (existingMember.role !== role) {
        await sendRoleUpdateEmail({
          email: targetUser.email,
          handbookTitle: handbook.title,
          handbookSlug: handbook.slug,
          adminName: adminName,
          oldRole: existingMember.role,
          newRole: role
        });
      }

      return NextResponse.json({
        success: true,
        message: `${targetUser.email}s roll i ${handbook.title} har uppdaterats till ${role}`,
        action: 'updated'
      });
    } else {
      // 9. Lägg till användaren som ny medlem
      const { error: insertError } = await supabase
        .from("handbook_members")
        .insert({
          handbook_id: handbookId,
          user_id: userId,
          role: role
        });

      if (insertError) {
        console.error("Fel vid tillägg av medlem:", insertError);
        return NextResponse.json(
          { success: false, message: "Kunde inte lägga till användaren" },
          { status: 500 }
        );
      }

      // 10. Skapa notifikationsinställningar för ny medlem (använd upsert för att undvika duplicates)
      const { error: notificationError } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          handbook_id: handbookId,
          email_new_topics: true,
          email_new_replies: true,
          email_mentions: true,
          app_new_topics: true,
          app_new_replies: true,
          app_mentions: true
        }, {
          onConflict: 'user_id,handbook_id'
        });

      if (notificationError) {
        console.error("Fel vid skapande av notifikationsinställningar:", notificationError);
        // Fortsätt ändå, detta är inte kritiskt
      }

      // 11. Skicka email när användaren läggs till i handbok
      await sendAdminAddedEmail({
        email: targetUser.email,
        handbookTitle: handbook.title,
        handbookSlug: handbook.slug,
        adminName: adminName,
        role: role
      });

      return NextResponse.json({
        success: true,
        message: `${targetUser.email} har lagts till i ${handbook.title} som ${role}`,
        action: 'added'
      });
    }
  } catch (error) {
    console.error("Oväntat fel vid uppdatering av handbok-roll:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. Hämta och validera session
    const authResult = await getHybridAuth(request);
    if (!authResult.userId) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // 2. Kontrollera att användaren är superadmin
    const supabase = getServiceSupabase();
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', authResult.userId)
      .maybeSingle();

    if (profileError || !profile?.is_superadmin) {
      return NextResponse.json(
        { success: false, message: "Du har inte superadmin-behörighet" },
        { status: 403 }
      );
    }

    // 3. Validera indata
    const { userId, handbookId } = await request.json();
    
    if (!userId || !handbookId) {
      return NextResponse.json(
        { success: false, message: "Ofullständiga uppgifter" },
        { status: 400 }
      );
    }

    // 4. Ta bort medlemskap
    const { error: deleteError } = await supabase
      .from("handbook_members")
      .delete()
      .eq("handbook_id", handbookId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Fel vid borttagning av medlem:", deleteError);
      return NextResponse.json(
        { success: false, message: "Kunde inte ta bort medlemskap" },
        { status: 500 }
      );
    }

    // 5. Ta bort notifikationsinställningar
    const { error: notificationDeleteError } = await supabase
      .from('user_notification_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('handbook_id', handbookId);

    if (notificationDeleteError) {
      console.error("Fel vid borttagning av notifikationsinställningar:", notificationDeleteError);
      // Fortsätt ändå, detta är inte kritiskt
    }

    return NextResponse.json({
      success: true,
      message: "Användaren har tagits bort från handboken"
    });
  } catch (error) {
    console.error("Oväntat fel vid borttagning av handbok-medlem:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
} 