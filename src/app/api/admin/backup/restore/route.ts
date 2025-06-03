import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager, BackupData } from '@/lib/backup';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API: Startar återställning från backup...');

    // EXTRA SÄKERHETSKONTROLL - detta är en farlig operation!
    const supabase = getServiceSupabase();
    
    // Hämta användarens session från headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Ingen auktorisering angiven' },
        { status: 401 }
      );
    }

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

    // Återställ från backup
    const backupManager = new DatabaseBackupManager();
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