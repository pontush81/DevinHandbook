import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function GET() {
  try {
    console.log('[Test Resend] Starting test...');
    console.log('[Test Resend] RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('[Test Resend] Resend instance:', !!resend);

    if (!resend) {
      return NextResponse.json({ error: 'Resend not configured' }, { status: 500 });
    }

    console.log('[Test Resend] Attempting to send test email...');

    const emailResult = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'pontus.hberg@gmail.com',
      subject: 'Test från Handbok.org - ' + new Date().toLocaleString('sv-SE'),
      html: `
        <h2>Test E-mail från Handbok.org</h2>
        <p>Detta är ett test-mail skickat ${new Date().toLocaleString('sv-SE')}</p>
        <p>Om du får detta mail fungerar Resend korrekt! 🎉</p>
        <hr>
        <p><small>Skickat från test-resend API endpoint</small></p>
      `,
    });

    console.log('[Test Resend] Email result:', emailResult);

    if (emailResult.error) {
      console.error('[Test Resend] Resend error:', emailResult.error);
      return NextResponse.json({ success: false, error: emailResult.error, resendDetails: emailResult }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'E-mail skickat framgångsrikt!', resendDetails: emailResult });

  } catch (error) {
    console.error('[Test Resend] Catch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
} 