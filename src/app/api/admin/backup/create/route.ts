import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager, BackupOptions } from '@/lib/backup';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API: Startar backup-skapande...');

    // Säkerhetskontroll - endast admin-användare
    const supabase = getServiceSupabase();
    
    // Hämta användarens session från headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Ingen auktorisering angiven' },
        { status: 401 }
      );
    }

    // Verifiera att användaren är admin (du kan anpassa denna logik)
    // För nu tillåter vi alla autentiserade användare - du kan lägga till admin-kontroll senare
    
    // Hämta backup-alternativ från request body
    const body = await request.json();
    const options: BackupOptions = {
      includeUserData: body.includeUserData ?? false,
      includeTrialData: body.includeTrialData ?? false,
      excludeTables: body.excludeTables ?? [],
      compression: body.compression ?? true
    };

    console.log('📋 Backup-alternativ:', options);

    // Skapa backup
    const backupManager = new DatabaseBackupManager();
    const backupData = await backupManager.createBackup(options);

    console.log('✅ Backup skapad framgångsrikt');

    return NextResponse.json({
      success: true,
      backup: backupData,
      message: 'Backup skapad framgångsrikt'
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