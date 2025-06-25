import { NextRequest, NextResponse } from 'next/server';
import { getHandbookTrialStatus } from '@/lib/trial-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const handbookId = params.id;

    if (!userId || !handbookId) {
      return NextResponse.json(
        { error: 'Missing userId or handbookId' },
        { status: 400 }
      );
    }

    console.log('🎯 [Handbook Trial Status API] Fetching status for:', {
      userId,
      handbookId
    });

    const trialStatus = await getHandbookTrialStatus(userId, handbookId);
    
    console.log('🎯 [Handbook Trial Status API] Returning status:', trialStatus);

    return NextResponse.json(trialStatus);
  } catch (error) {
    console.error('Error in handbook trial status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 