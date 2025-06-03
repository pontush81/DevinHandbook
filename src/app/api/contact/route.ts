import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Conditional Resend initialization to prevent build failures
let resend: Resend | null = null;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch (error) {
  console.warn('[Contact] Resend initialization failed:', error);
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData: ContactFormData = await request.json();
    
    // Validera indata
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      return NextResponse.json(
        { error: 'Alla fält måste fyllas i' }, 
        { status: 400 }
      );
    }

    // Validera e-postformat
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return NextResponse.json(
        { error: 'Ogiltig e-postadress' }, 
        { status: 400 }
      );
    }

    // Logga kontaktförfrågan
    console.log('[Contact] Ny kontaktförfrågan mottagen:', {
      name: formData.name,
      email: formData.email,
      subject: formData.subject,
      timestamp: new Date().toISOString()
    });

    // Skicka e-post till admin
    await sendContactEmail(formData);
    
    // Skicka bekräftelsemail till användaren
    await sendConfirmationEmail(formData);

    return NextResponse.json({ 
      success: true, 
      message: 'Meddelandet har skickats framgångsrikt' 
    });

  } catch (error) {
    console.error('[Contact] Fel vid hantering av kontaktformuläret:', error);
    return NextResponse.json(
      { error: 'Ett oväntat fel uppstod. Försök igen senare.' }, 
      { status: 500 }
    );
  }
}

async function sendContactEmail(formData: ContactFormData) {
  try {
    if (!resend) {
      console.warn('[Contact] Resend not available, skipping admin email notification');
      return;
    }

    if (!process.env.ADMIN_EMAIL) {
      console.warn('[Contact] ADMIN_EMAIL not configured, skipping admin notification');
      return;
    }

    const submittedDate = new Date().toLocaleString('sv-SE');
    
    await resend.emails.send({
      from: 'Handbok.org <onboarding@resend.dev>',
      to: [process.env.ADMIN_EMAIL],
      subject: `📧 Ny kontaktförfrågan: ${formData.subject}`,
      replyTo: formData.email,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Ny kontaktförfrågan från Handbok.org</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Kontaktinformation:</h3>
            <p><strong>Namn:</strong> ${formData.name}</p>
            <p><strong>E-post:</strong> ${formData.email}</p>
            <p><strong>Ämne:</strong> ${formData.subject}</p>
            <p><strong>Datum:</strong> ${submittedDate}</p>
          </div>
          
          <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Meddelande:</h3>
            <p style="line-height: 1.6; color: #4b5563; white-space: pre-line;">${formData.message}</p>
          </div>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 0;"><strong>💡 Tips:</strong></p>
            <p style="margin: 5px 0 0 0;">Du kan svara direkt på detta e-mail för att kontakta kunden.</p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Detta är en automatisk notifikation från Handbok.org kontaktformuläret.
          </p>
        </div>
      `
    });
    
    console.log('[Contact] Admin e-postnotifikation skickad för kontaktförfrågan från:', formData.email);
  } catch (error) {
    console.error('[Contact] Fel vid admin e-postutskick:', error);
    // Vi kastar inte fel här för att inte stoppa hela processen
  }
}

async function sendConfirmationEmail(formData: ContactFormData) {
  try {
    if (!resend) {
      console.warn('[Contact] Resend not available, skipping confirmation email');
      return;
    }

    await resend.emails.send({
      from: 'Handbok.org <onboarding@resend.dev>',
      to: [formData.email],
      subject: 'Tack för din kontakt - Handbok.org',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Tack för din kontakt!</h2>
          
          <p>Hej ${formData.name},</p>
          
          <p>Tack för att du kontaktade oss via Handbok.org. Vi har mottagit ditt meddelande och kommer att återkomma till dig så snart som möjligt.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Ditt meddelande:</h3>
            <p><strong>Ämne:</strong> ${formData.subject}</p>
            <p style="margin-top: 10px; line-height: 1.6; white-space: pre-line;">${formData.message}</p>
          </div>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 0;"><strong>Nästa steg:</strong></p>
            <ul style="margin: 10px 0;">
              <li>Vi granskar ditt meddelande</li>
              <li>Vi återkommer inom 24 timmar</li>
              <li>Du får svar på denna e-postadress: ${formData.email}</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://handbok.org'}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Besök Handbok.org
            </a>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Med vänliga hälsningar,<br>
            Handbok.org teamet
          </p>
        </div>
      `
    });
    
    console.log('[Contact] Bekräftelsemail skickat till:', formData.email);
  } catch (error) {
    console.error('[Contact] Fel vid bekräftelsemail:', error);
    // Vi kastar inte fel här för att inte stoppa hela processen
  }
} 