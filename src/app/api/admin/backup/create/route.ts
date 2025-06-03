import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager } from '@/lib/backup';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check if superadmin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile?.is_superadmin) {
      return NextResponse.json({ error: 'Unauthorized - Superadmin required' }, { status: 403 });
    }

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

    // Skapa backup
    const backupManager = new DatabaseBackupManager(supabase);
    const backupData = await backupManager.createBackup(options, session.user.id);

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