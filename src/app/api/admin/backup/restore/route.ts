import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager, BackupData } from '@/lib/backup';
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

    console.log('🔄 API: Startar återställning från backup...');

    // Hämta backup-data och alternativ från request body
    const body = await request.json();
    const { backupData, force } = body;

    if (!backupData) {
      return NextResponse.json(
        { error: 'Ingen backup-data angiven' },
        { status: 400 }
      );
    }

    // Extra säkerhetskontroll - kräv explicit force-flagga
    if (!force) {
      return NextResponse.json(
        { 
          error: 'Återställning kräver explicit bekräftelse',
          message: 'Detta kommer att ersätta ALL data i databasen. Sätt force=true för att fortsätta.'
        },
        { status: 400 }
      );
    }

    console.log('⚠️  VARNING: Återställer databas från backup...');
    console.log('📋 Backup ID:', backupData.metadata?.id);
    console.log('📅 Backup datum:', backupData.metadata?.created_at);

    // Kontrollera att service role-nyckel finns
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY saknas i miljövariabler');
      return NextResponse.json({ 
        error: 'Server-konfigurationsfel', 
        details: 'Service role-nyckel saknas' 
      }, { status: 500 });
    }

    // Skapa service role-klient för backup-återställning (bypassa RLS)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Återställ från backup med service role-klient
    const backupManager = new DatabaseBackupManager(serviceSupabase);
    await backupManager.restoreFromBackup(backupData as BackupData, { force: true });

    console.log('✅ Återställning slutförd framgångsrikt');

    return NextResponse.json({
      success: true,
      message: 'Databas återställd framgångsrikt från backup',
      restoredBackup: {
        id: backupData.metadata?.id,
        created_at: backupData.metadata?.created_at,
        table_counts: backupData.metadata?.table_counts
      }
    });

  } catch (error) {
    console.error('❌ Fel vid återställning från backup:', error);
    
    return NextResponse.json(
      { 
        error: 'Fel vid återställning från backup',
        details: error instanceof Error ? error.message : 'Okänt fel'
      },
      { status: 500 }
    );
  }
} 