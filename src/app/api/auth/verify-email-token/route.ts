import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token, userId, email, timestamp } = await request.json();

    if (!token || !userId || !email || !timestamp) {
      return NextResponse.json(
        { error: 'Alla parametrar krävs' },
        { status: 400 }
      );
    }

    // Kontrollera att timestampen inte är för gammal (24 timmar)
    const now = Date.now();
    const tokenTime = parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 timmar i millisekunder

    if (now - tokenTime > maxAge) {
      return NextResponse.json(
        { error: 'Bekräftelselänken har gått ut. Begär en ny bekräftelse.' },
        { status: 400 }
      );
    }

    // Verifiera token
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'fallback-secret';
    const payload = `${userId}:${email}:${timestamp}`;
    const expectedToken = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Ogiltig bekräftelsetoken' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token verifierad'
    });

  } catch (error) {
    console.error('[Verify Token] Error:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid tokenverifiering' },
      { status: 500 }
    );
  }
} 