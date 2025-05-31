import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    email: string;
    created_at: string;
    email_confirmed_at?: string;
  };
  old_record?: any;
  schema: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verifiera webhook-autentisering
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`;
    
    if (!authHeader || authHeader !== expectedAuth) {
      console.error('[Webhook] Ogiltig autentisering');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: WebhookPayload = await request.json();
    
    // Logga webhook-mottagning
    console.log('[Webhook] Ny användare webhook mottagen:', {
      type: payload.type,
      table: payload.table,
      userId: payload.record?.id,
      email: payload.record?.email,
      timestamp: new Date().toISOString()
    });

    // Hantera endast nya användarregistreringar
    if (payload.type === 'INSERT' && payload.table === 'users') {
      const { record } = payload;
      
      // Skicka e-postnotifikation till admin
      await sendNewUserNotification({
        userId: record.id,
        email: record.email,
        registeredAt: record.created_at
      });
      
      // Du kan även lägga till andra notifikationer här:
      // - Slack-meddelande
      // - Discord webhook
      // - SMS-notifikation
      // - Spara till databas för statistik
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Fel vid hantering av webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

async function sendNewUserNotification({
  userId,
  email,
  registeredAt
}: {
  userId: string;
  email: string;
  registeredAt: string;
}) {
  try {
    const registeredDate = new Date(registeredAt).toLocaleString('sv-SE');
    
    await resend.emails.send({
      from: 'Handbok.org <noreply@handbok.org>',
      to: [process.env.ADMIN_EMAIL!], // Din e-post
      subject: '🎉 Ny kund registrerad på Handbok.org',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Ny kund registrerad!</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Kundinformation:</h3>
            <p><strong>E-post:</strong> ${email}</p>
            <p><strong>Användar-ID:</strong> ${userId}</p>
            <p><strong>Registrerad:</strong> ${registeredDate}</p>
          </div>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="margin: 0;"><strong>Nästa steg för kunden:</strong></p>
            <ol style="margin: 10px 0;">
              <li>Bekräfta e-post via e-postlänk</li>
              <li>Logga in på kontot</li>
              <li>Skapa första handboken</li>
            </ol>
          </div>
          
          <p style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Gå till Admin Dashboard
            </a>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Detta är en automatisk notifikation från Handbok.org systemet.
          </p>
        </div>
      `
    });
    
    console.log('[Webhook] E-postnotifikation skickad för ny användare:', email);
  } catch (error) {
    console.error('[Webhook] Fel vid e-postutskick:', error);
  }
} 