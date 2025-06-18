import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    const { name, email, organization, message } = await req.json();

    // Validate input
    if (!name || !email || !organization) {
      return NextResponse.json(
        { error: 'Namn, e-post och organisation är obligatoriska' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ogiltig e-postadress' },
        { status: 400 }
      );
    }

    if (!resend) {
      console.error('[Pilot Request] Resend not configured - missing RESEND_API_KEY');
      return NextResponse.json(
        { error: 'E-postservice inte konfigurerad' },
        { status: 500 }
      );
    }

    // Send notification email to us
    const notificationResult = await resend.emails.send({
      from: 'pilotkund@handbok.org',
      to: ['gulmaranbrf@gmail.com', 'pontus.hberg@gmail.com'], // Your notification emails
      subject: '🚀 Ny pilotkund-förfrågan!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3498db;">Ny pilotkund-förfrågan</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Kontaktinformation</h3>
            <p><strong>Namn:</strong> ${name}</p>
            <p><strong>E-post:</strong> ${email}</p>
            <p><strong>Organisation:</strong> ${organization}</p>
          </div>
          
          ${message ? `
          <div style="background: #fff; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0;">
            <h3 style="margin-top: 0;">Meddelande</h3>
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Nästa steg:</strong> Kontakta ${name} på ${email} för att diskutera pilotkund-möjligheter.</p>
          </div>
        </div>
      `
    });

    if (notificationResult.error) {
      console.error('[Pilot Request] Failed to send notification:', notificationResult.error);
      return NextResponse.json(
        { error: 'Kunde inte skicka meddelande' },
        { status: 500 }
      );
    }

    // Send confirmation email to the requester
    const confirmationResult = await resend.emails.send({
      from: 'pilotkund@handbok.org',
      to: email,
      subject: 'Tack för ditt intresse som pilotkund! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3498db;">Tack för ditt intresse!</h2>
          
          <p>Hej ${name},</p>
          
          <p>Tack för att du vill vara pilotkund för Handbok.org! Vi är glada över ditt intresse.</p>
          
          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Vad händer nu?</h3>
            <ul style="margin-bottom: 0;">
              <li>Vi kommer att kontakta dig inom 24 timmar</li>
              <li>Vi diskuterar era specifika behov</li>
              <li>Vi sätter upp en personlig demo</li>
              <li>Som pilotkund får ni förtur och specialpriser</li>
            </ul>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Organisation:</strong> ${organization}</p>
            <p style="margin: 5px 0 0 0;"><strong>Kontakt:</strong> ${email}</p>
          </div>
          
          <p>Vi ser fram emot att arbeta med er!</p>
          
          <p>Med vänliga hälsningar,<br>
          <strong>Handbok.org-teamet</strong></p>
        </div>
      `
    });

    if (confirmationResult.error) {
      console.error('[Pilot Request] Failed to send confirmation:', confirmationResult.error);
      // Don't fail the request if confirmation fails, notification was sent
    }

    return NextResponse.json({
      success: true,
      message: 'Din förfrågan har skickats! Vi kontaktar dig inom 24 timmar.'
    });

  } catch (error) {
    console.error('[Pilot Request] Error:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod. Försök igen senare.' },
      { status: 500 }
    );
  }
} 