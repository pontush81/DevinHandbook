import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export async function POST(request: NextRequest) {
  // Endast i development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Endast tillgängligt i development' }, { status: 403 });
  }

  try {
    const { email, userId, joinCode } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email och userId krävs' },
        { status: 400 }
      );
    }

    // Skapa samma token som i send-confirmation-email
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'fallback-secret';
    const timestamp = Date.now().toString();
    const payload = `${userId}:${email}:${timestamp}`;
    const token = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Skapa bekräftelselänk
    const confirmUrl = `http://localhost:3000/auth/confirm-email?token=${token}&userId=${userId}&email=${encodeURIComponent(email)}&timestamp=${timestamp}${joinCode ? `&joinCode=${joinCode}` : ''}`;

    return NextResponse.json({
      success: true,
      confirmUrl,
      token,
      timestamp,
      message: 'Debug bekräftelselänk skapad'
    });

  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      { error: 'Fel vid skapande av test-länk' },
      { status: 500 }
    );
  }
} 