import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager } from '@/lib/backup';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    console.log('📊 API: Hämtar backup-statistik...');

    // Hämta backup-statistik
    const backupManager = new DatabaseBackupManager(supabase);
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