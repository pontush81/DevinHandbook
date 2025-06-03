import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager } from '@/lib/backup';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 API: Hämtar backup-statistik...');

    // Hämta backup-statistik
    const backupManager = new DatabaseBackupManager();
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