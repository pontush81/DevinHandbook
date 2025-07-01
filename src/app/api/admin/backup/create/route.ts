import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager } from '@/lib/backup';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/security-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    console.log('💾 API: Startar backup-process...');

    // Hämta backup-alternativ från request body
    const body = await request.json().catch(() => ({}));
    const options = {
      includeUserData: body.includeUserData ?? false,
      includeTrialData: body.includeTrialData ?? false,
      excludeTables: body.excludeTables ?? [],
      compression: body.compression ?? true
    };

    console.log('📋 Backup-alternativ:', options);

    // Skapa backup med service-klient för data och autentiserad klient för historik
    const backupManager = new DatabaseBackupManager(serviceSupabase, supabase);
    const backupData = await backupManager.createBackup(options, authResult.userId!);

    console.log('✅ Backup skapad framgångsrikt');
    console.log(`📊 Totalt antal poster: ${Object.values(backupData.metadata.table_counts).reduce((a, b) => a + b, 0)}`);
    console.log(`💾 Storlek: ${(backupData.metadata.size_bytes / 1024 / 1024).toFixed(2)} MB`);

    return NextResponse.json({
      success: true,
      backup: backupData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Fel vid skapande av backup:', error);
    
    return NextResponse.json(
      { 
        error: 'Fel vid skapande av backup',
        details: error instanceof Error ? error.message : 'Okänt fel'
      },
      { status: 500 }
    );
  }
} 