import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createHmac } from 'crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    console.log('[Send Confirmation] API called');
    const { email, userId, joinCode } = await request.json();
    console.log('[Send Confirmation] Parsed data:', { email, userId, joinCode });

    if (!email || !userId) {
      console.log('[Send Confirmation] Missing required fields');
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      );
    }

    console.log('[Send Confirmation] RESEND_API_KEY available:', !!process.env.RESEND_API_KEY);
    console.log('[Send Confirmation] Resend instance:', !!resend);

    if (!resend) {
      console.log('[Send Confirmation] Email service not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Skapa en säker bekräftelsetoken
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'fallback-secret';
    const timestamp = Date.now().toString();
    const payload = `${userId}:${email}:${timestamp}`;
    const token = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Skapa bekräftelselänk
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://handbok.org';
    
    const confirmUrl = `${baseUrl}/auth/confirm-email?token=${token}&userId=${userId}&email=${encodeURIComponent(email)}&timestamp=${timestamp}${joinCode ? `&joinCode=${joinCode}` : ''}`;

    console.log('[Send Confirmation] Confirm URL generated:', confirmUrl);

    // Skicka email
    const fromDomain = process.env.NODE_ENV === 'production' 
      ? process.env.RESEND_DOMAIN || 'handbok.org'
      : 'onboarding@resend.dev';
    
    const fromEmail = process.env.NODE_ENV === 'production'
      ? `Handbok.org <noreply@${fromDomain}>`
      : `Handbok.org <${fromDomain}>`;

    console.log('[Send Confirmation] Email config:', { fromEmail, toEmail: email, environment: process.env.NODE_ENV });
    console.log('[Send Confirmation] About to call resend.emails.send...');

    // Use verified handbok.org domain for production-quality emails
    const emailResult = await resend.emails.send({
      from: 'Handbok.org <noreply@handbok.org>',
      to: email,
      subject: joinCode ? 'Bekräfta din e-post och gå med i handboken' : 'Bekräfta din e-post - Handbok.org',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📚 Bekräfta din e-postadress</h1>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <h2 style="color: #2563eb; margin-top: 0;">Välkommen till Handbok.org!</h2>
            
            <p>Tack för att du registrerade dig! För att aktivera ditt konto behöver du bekräfta din e-postadress genom att klicka på knappen nedan:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Bekräfta e-postadress
              </a>
            </div>
            
            ${joinCode ? `
              <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <p style="margin: 0;"><strong>🎉 Du har bjudits in till en handbok!</strong></p>
                <p style="margin: 5px 0 0 0;">Efter att du bekräftat din e-post kommer du automatiskt att gå med i handboken.</p>
              </div>
            ` : ''}
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Nästa steg:</strong></p>
              <ol style="margin: 10px 0;">
                <li>Klicka på bekräftelseknappen ovan</li>
                <li>Du omdirigeras till Handbok.org</li>
                <li>${joinCode ? 'Du går automatiskt med i handboken' : 'Du kan börja skapa din handbok'}</li>
              </ol>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Om knappen inte fungerar kan du kopiera och klistra in denna länk i din webbläsare:<br>
              <a href="${confirmUrl}" style="color: #2563eb; word-break: break-all;">${confirmUrl}</a>
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">Du får detta meddelande eftersom du registrerade ett konto på Handbok.org.</p>
            <p style="margin: 5px 0 0 0;">Om du inte registrerade dig kan du ignorera detta meddelande.</p>
          </div>
        </div>
      `,
      tags: [
        { name: 'type', value: 'email_confirmation' },
        { name: 'join_code', value: joinCode || 'none' },
        { name: 'environment', value: process.env.NODE_ENV || 'development' }
      ]
    });

    if (emailResult.error) {
      console.error('[Send Confirmation] Resend error:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 }
      );
    }

    console.log('[Send Confirmation] Email sent successfully:', emailResult.data?.id);

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent',
      emailId: emailResult.data?.id
    });

  } catch (error) {
    console.error('[Send Confirmation] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 