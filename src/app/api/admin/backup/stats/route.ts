import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager } from '@/lib/backup';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/security-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Standardiserad admin-autentisering
    const authResult = await adminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Skapa service-role klient för databas-operationer
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('📊 API: Hämtar backup-statistik...');

    // Hämta backup-statistik med service-klient för data och autentiserad klient för historik
    const backupManager = new DatabaseBackupManager(serviceSupabase, supabase);
    const stats = await backupManager.getBackupStatistics();

    console.log('✅ Backup-statistik hämtad');

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Fel vid hämtning av backup-statistik:', error);
    
    return NextResponse.json(
      { 
        error: 'Fel vid hämtning av backup-statistik',
        details: error instanceof Error ? error.message : 'Okänt fel'
      },
      { status: 500 }
    );
  }
} 