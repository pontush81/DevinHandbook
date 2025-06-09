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
      to: 'gulmaranbrf@gmail.com',
      subject: 'Test Email från Handbok.org',
      html: '<h1>Test</h1><p>Detta är ett test-email.</p>'
    });

    console.log('[Test Resend] Email result:', emailResult);

    if (emailResult.error) {
      console.error('[Test Resend] Resend error:', emailResult.error);
      return NextResponse.json({
        success: false,
        error: emailResult.error,
        resendDetails: emailResult
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      emailId: emailResult.data?.id,
      result: emailResult
    });

  } catch (error) {
    console.error('[Test Resend] Catch error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 