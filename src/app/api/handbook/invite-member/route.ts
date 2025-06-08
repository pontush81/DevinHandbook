import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    // 1. Hämta och validera session
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // 2. Validera indata
    const { handbookId, email, role } = await request.json();
    
    if (!handbookId || !email || !role) {
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

    // 3. Kontrollera att användaren har admin-behörighet för handboken
    const supabase = getServiceSupabase();
    
    const { data: adminCheck, error: adminError } = await supabase
      .from("handbook_members")
      .select("id")
      .eq("handbook_id", handbookId)
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminError) {
      console.error("Fel vid kontroll av admin-behörighet:", adminError);
      return NextResponse.json(
        { success: false, message: "Kunde inte verifiera admin-behörighet" },
        { status: 500 }
      );
    }

    // DEVELOPMENT OVERRIDE: Allow access for logged-in users in development
    const isAdmin = !!adminCheck;
    const allowAccess = process.env.NODE_ENV === 'development' || isAdmin;

    if (!allowAccess) {
      return NextResponse.json(
        { success: false, message: "Du har inte admin-behörighet för denna handbok" },
        { status: 403 }
      );
    }

    // 3.1. Hämta handboksinformation för e-post
    const { data: handbook, error: handbookError } = await supabase
      .from("handbooks")
      .select("title, slug, description")
      .eq("id", handbookId)
      .single();

    if (handbookError || !handbook) {
      console.error("Fel vid hämtning av handbok:", handbookError);
      return NextResponse.json(
        { success: false, message: "Kunde inte hämta handboksinformation" },
        { status: 500 }
      );
    }

    // 3.2. Hämta admin-användarens information för e-post
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", session.user.id)
      .single();

    const adminName = adminProfile?.full_name || adminProfile?.email || "Administratör";

    // 4. Hitta användaren baserat på e-post
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      console.error("Fel vid sökning efter användare:", userError);
      return NextResponse.json(
        { success: false, message: "Kunde inte söka efter användaren" },
        { status: 500 }
      );
    }

    let userId: string;
    let isNewUser = false;
    
    if (!user) {
      // 5a. Användaren finns inte - skicka inbjudning till ny användare
      isNewUser = true;
      
      // Hämta eller skapa join-kod för handboken
      let { data: joinCodeData, error: joinCodeError } = await supabase
        .from("handbooks")
        .select("join_code")
        .eq("id", handbookId)
        .single();

      if (joinCodeError || !joinCodeData?.join_code) {
        // Skapa ny join-kod om ingen finns
        const { error: createJoinCodeError } = await supabase
          .rpc('create_handbook_join_code', { handbook_id: handbookId, expires_in_days: 30 });

        if (createJoinCodeError) {
          console.error("Fel vid skapande av join-kod:", createJoinCodeError);
          return NextResponse.json(
            { success: false, message: "Kunde inte skapa inbjudningslänk" },
            { status: 500 }
          );
        }

        // Hämta den nya join-koden
        const { data: newJoinCodeData, error: newJoinCodeError } = await supabase
          .from("handbooks")
          .select("join_code")
          .eq("id", handbookId)
          .single();

        if (newJoinCodeError || !newJoinCodeData?.join_code) {
          console.error("Fel vid hämtning av ny join-kod:", newJoinCodeError);
          return NextResponse.json(
            { success: false, message: "Kunde inte hämta inbjudningslänk" },
            { status: 500 }
          );
        }

        joinCodeData = newJoinCodeData;
      }

      // Skicka inbjudnings-e-post till ny användare
      await sendInvitationEmail({
        email,
        handbookTitle: handbook.title,
        handbookSlug: handbook.slug,
        handbookDescription: handbook.description,
        adminName,
        role,
        joinCode: joinCodeData.join_code,
        isNewUser: true
      });

      return NextResponse.json({
        success: true,
        message: `Inbjudan skickad till ${email}. Användaren behöver registrera sig och använda inbjudningslänken för att gå med.`
      });

    } else {
      userId = user.id;

      // 5b. Kontrollera om användaren redan är medlem
      const { data: existingMember, error: memberError } = await supabase
        .from("handbook_members")
        .select("id, role")
        .eq("handbook_id", handbookId)
        .eq("user_id", userId)
        .maybeSingle();

      if (memberError) {
        console.error("Fel vid kontroll av befintligt medlemskap:", memberError);
        return NextResponse.json(
          { success: false, message: "Kunde inte kontrollera befintligt medlemskap" },
          { status: 500 }
        );
      }

      if (existingMember) {
        // 6a. Uppdatera roll om användaren redan är medlem
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

        // Skicka e-post om rolluppdatering om rollen ändrats
        if (existingMember.role !== role) {
          await sendRoleUpdateEmail({
            email,
            handbookTitle: handbook.title,
            handbookSlug: handbook.slug,
            adminName,
            oldRole: existingMember.role,
            newRole: role
          });
        }

        return NextResponse.json({
          success: true,
          message: "Användarens roll har uppdaterats"
        });
      } else {
        // 6b. Lägg till användaren som medlem
        const { error: insertError } = await supabase
          .from("handbook_members")
          .insert({
            handbook_id: handbookId,
            user_id: userId,
            role,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error("Fel vid tillägg av medlem:", insertError);
          return NextResponse.json(
            { success: false, message: "Kunde inte lägga till användaren som medlem" },
            { status: 500 }
          );
        }

        // Skicka välkomst-e-post till befintlig användare
        await sendInvitationEmail({
          email,
          handbookTitle: handbook.title,
          handbookSlug: handbook.slug,
          handbookDescription: handbook.description,
          adminName,
          role,
          isNewUser: false
        });

        return NextResponse.json({
          success: true,
          message: "Användaren har lagts till som medlem och får en välkomst-e-post"
        });
      }
    }
  } catch (error) {
    console.error("Oväntat fel vid inbjudan av medlem:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
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