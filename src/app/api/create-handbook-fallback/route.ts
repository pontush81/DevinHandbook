import { NextRequest, NextResponse } from 'next/server';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';

export async function POST(req: NextRequest) {
  // Allow this in all environments since webhooks can be unreliable
  console.log(`[Fallback] Running in ${process.env.NODE_ENV} mode`);

  try {
    const { handbookName, subdomain, userId } = await req.json();
    
    if (!handbookName || !subdomain) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[Fallback] Creating handbook: ${handbookName}, subdomain: ${subdomain}, userId: ${userId || 'null'}`);
    
    // Try to create the handbook
    const handbookId = await createHandbookWithSectionsAndPages(
      handbookName, 
      subdomain, 
      completeBRFHandbook, 
      userId || null
    );
    
    console.log(`[Fallback] Handbook created successfully with id: ${handbookId}`);
    
    return NextResponse.json({ 
      success: true, 
      handbookId,
      message: 'Handbook created via fallback mechanism' 
    });
    
  } catch (error: any) {
    console.error('[Fallback] Error creating handbook:', error);
    
    // If it's a duplicate error, that's actually fine - the handbook already exists
    if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
      return NextResponse.json({ 
        success: true, 
        message: 'Handbook already exists' 
      });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create handbook',
      details: error.message 
    }, { status: 500 });
  }
} 