import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager, BackupOptions, generateBackupFilename } from '@/lib/backup';
import { Resend } from 'resend';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    console.log('⏰ API: Startar schemalagd backup...');

    // Hämta konfiguration från request body eller använd defaults
    const body = await request.json().catch(() => ({}));
    const options: BackupOptions = {
      includeUserData: body.includeUserData ?? false,
      includeTrialData: body.includeTrialData ?? false,
      excludeTables: body.excludeTables ?? [],
      compression: body.compression ?? true
    };

    const emailConfig = {
      sendEmail: body.sendEmail ?? true,
      emailTo: body.emailTo ?? process.env.ADMIN_EMAIL ?? 'admin@handbok.org',
      emailSubject: body.emailSubject ?? 'Schemalagd databas-backup'
    };

    console.log('📋 Backup-alternativ:', options);
    console.log('📧 Email-konfiguration:', { ...emailConfig, emailTo: emailConfig.emailTo ? '***' : 'Ingen' });

    // Skapa backup
    const backupManager = new DatabaseBackupManager();
    const backupData = await backupManager.createBackup({
      ...options,
      // Markera som schemalagd backup
    });

    // Uppdatera metadata för schemalagd backup
    backupData.metadata.backup_type = 'scheduled';

    const filename = generateBackupFilename(backupData.metadata);
    const backupJson = JSON.stringify(backupData, null, 2);

    console.log('✅ Schemalagd backup skapad framgångsrikt');
    console.log(`📁 Filnamn: ${filename}`);
    console.log(`💾 Storlek: ${(backupData.metadata.size_bytes / 1024 / 1024).toFixed(2)} MB`);

    // Skicka email med backup om konfigurerat
    let emailResult = null;
    if (emailConfig.sendEmail && emailConfig.emailTo && process.env.RESEND_API_KEY) {
      try {
        console.log('📧 Skickar backup via email...');

        const emailHtml = `
          <h2>Schemalagd databas-backup</h2>
          <p>En automatisk backup av databasen har skapats.</p>
          
          <h3>Backup-information:</h3>
          <ul>
            <li><strong>ID:</strong> ${backupData.metadata.id}</li>
            <li><strong>Skapad:</strong> ${new Date(backupData.metadata.created_at).toLocaleString('sv-SE')}</li>
            <li><strong>Typ:</strong> ${backupData.metadata.backup_type}</li>
            <li><strong>Storlek:</strong> ${(backupData.metadata.size_bytes / 1024 / 1024).toFixed(2)} MB</li>
            <li><strong>Checksum:</strong> ${backupData.metadata.checksum.substring(0, 16)}...</li>
          </ul>

          <h3>Tabeller som säkerhetskopierats:</h3>
          <ul>
            ${Object.entries(backupData.metadata.table_counts)
              .map(([table, count]) => `<li><strong>${table}:</strong> ${count} poster</li>`)
              .join('')}
          </ul>

          <p><strong>Total antal poster:</strong> ${Object.values(backupData.metadata.table_counts).reduce((a, b) => a + b, 0)}</p>
          
          <p>Backup-filen är bifogad till detta email.</p>
          
          <hr>
          <p><small>Detta är en automatisk backup från Handbok-systemet.</small></p>
        `;

        emailResult = await resend.emails.send({
          from: 'backup@handbok.org',
          to: emailConfig.emailTo,
          subject: `${emailConfig.emailSubject} - ${new Date().toLocaleDateString('sv-SE')}`,
          html: emailHtml,
          attachments: [
            {
              filename: filename,
              content: Buffer.from(backupJson, 'utf-8'),
              contentType: 'application/json'
            }
          ]
        });

        console.log('✅ Email skickat framgångsrikt:', emailResult.data?.id);

      } catch (emailError) {
        console.error('❌ Fel vid skickning av email:', emailError);
        emailResult = { error: emailError instanceof Error ? emailError.message : 'Okänt email-fel' };
      }
    }

    return NextResponse.json({
      success: true,
      backup: {
        id: backupData.metadata.id,
        created_at: backupData.metadata.created_at,
        size_bytes: backupData.metadata.size_bytes,
        table_counts: backupData.metadata.table_counts,
        filename: filename
      },
      email: emailResult,
      message: 'Schemalagd backup skapad framgångsrikt'
    });

  } catch (error) {
    console.error('❌ Fel vid schemalagd backup:', error);
    
    return NextResponse.json(
      { 
        error: 'Fel vid schemalagd backup',
        details: error instanceof Error ? error.message : 'Okänt fel'
      },
      { status: 500 }
    );
  }
}

// GET-endpoint för att hämta schemalagd backup-status
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

    // Hämta information om senaste schemalagda backup
    const backupManager = new DatabaseBackupManager();
    const stats = await backupManager.getBackupStatistics();

    return NextResponse.json({
      success: true,
      scheduledBackupStatus: {
        lastBackup: stats.lastBackupDate,
        nextScheduled: null, // Implementera senare med cron-jobb
        isEnabled: true,
        frequency: 'daily' // Konfigurerbart senare
      },
      stats
    });

  } catch (error) {
    console.error('❌ Fel vid hämtning av schemalagd backup-status:', error);
    
    return NextResponse.json(
      { 
        error: 'Fel vid hämtning av schemalagd backup-status',
        details: error instanceof Error ? error.message : 'Okänt fel'
      },
      { status: 500 }
    );
  }
} 