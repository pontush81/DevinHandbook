import { NextRequest, NextResponse } from 'next/server';
import { getHandbookStatus, toTrialStatusResponse } from '@/lib/handbook-status';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id: handbookId } = await params;

    if (!userId || !handbookId) {
      return NextResponse.json(
        { error: 'Missing userId or handbookId' },
        { status: 400 }
      );
    }

    console.log('🎯 [Trial Status API] Simple check for:', { userId, handbookId });

    // Använd den nya enkla logiken
    const status = await getHandbookStatus(handbookId, userId);
    const response = toTrialStatusResponse(status);

    console.log('🎯 [Trial Status API] Response:', response);
    
    // Skapa response med no-cache headers för real-time data
    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ [Trial Status API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 