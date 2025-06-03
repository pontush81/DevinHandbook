import { NextRequest, NextResponse } from 'next/server';
import { DatabaseBackupManager, generateBackupFilename } from '@/lib/backup';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Denna endpoint kan anropas av externa cron-tjänster (t.ex. Vercel Cron, GitHub Actions, etc.)
export async function POST(request: NextRequest) {
  try {
    console.log('⏰ CRON: Startar automatisk daglig backup...');

    // Säkerhetskontroll - kontrollera cron-token
    const cronToken = request.headers.get('x-cron-token') || request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (!expectedToken) {
      console.error('❌ CRON_SECRET_TOKEN inte konfigurerad');
      return NextResponse.json(
        { error: 'Cron-token inte konfigurerad' },
        { status: 500 }
      );
    }

    if (cronToken !== expectedToken && cronToken !== `Bearer ${expectedToken}`) {
      console.error('❌ Ogiltig cron-token');
      return NextResponse.json(
        { error: 'Ogiltig cron-token' },
        { status: 401 }
      );
    }

    // Konfiguration för automatisk backup
    const backupConfig = {
      includeUserData: false, // Säkrare att inte inkludera känslig användardata i automatiska backups
      includeTrialData: false,
      excludeTables: [],
      compression: true
    };

    const emailConfig = {
      sendEmail: true,
      emailTo: process.env.ADMIN_EMAIL || process.env.BACKUP_EMAIL || 'admin@handbok.org',
      emailSubject: 'Automatisk daglig backup'
    };

    console.log('📋 Automatisk backup-konfiguration:', backupConfig);

    // Skapa backup
    const backupManager = new DatabaseBackupManager();
    const backupData = await backupManager.createBackup(backupConfig);

    // Markera som schemalagd backup
    backupData.metadata.backup_type = 'scheduled';
    backupData.metadata.created_by = 'cron-system';

    const filename = generateBackupFilename(backupData.metadata);
    const backupJson = JSON.stringify(backupData, null, 2);

    console.log('✅ Automatisk backup skapad framgångsrikt');
    console.log(`📁 Filnamn: ${filename}`);
    console.log(`💾 Storlek: ${(backupData.metadata.size_bytes / 1024 / 1024).toFixed(2)} MB`);

    // Skicka email med backup
    let emailResult = null;
    if (emailConfig.sendEmail && emailConfig.emailTo && process.env.RESEND_API_KEY) {
      try {
        console.log('📧 Skickar automatisk backup via email...');

        const totalRecords = Object.values(backupData.metadata.table_counts).reduce((a, b) => a + b, 0);
        
        const emailHtml = `
          <h2>🤖 Automatisk daglig backup</h2>
          <p>En automatisk backup av databasen har skapats och körs enligt schema.</p>
          
          <h3>📊 Backup-information:</h3>
          <ul>
            <li><strong>ID:</strong> ${backupData.metadata.id}</li>
            <li><strong>Skapad:</strong> ${new Date(backupData.metadata.created_at).toLocaleString('sv-SE')}</li>
            <li><strong>Typ:</strong> Automatisk schemalagd backup</li>
            <li><strong>Storlek:</strong> ${(backupData.metadata.size_bytes / 1024 / 1024).toFixed(2)} MB</li>
            <li><strong>Totalt poster:</strong> ${totalRecords}</li>
            <li><strong>Checksum:</strong> ${backupData.metadata.checksum.substring(0, 16)}...</li>
          </ul>

          <h3>📋 Tabeller som säkerhetskopierats:</h3>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Tabell</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Antal poster</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(backupData.metadata.table_counts)
                .map(([table, count]) => `
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 8px;">${table}</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${count}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>

          <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 16px; margin: 16px 0;">
            <h4 style="margin: 0 0 8px 0; color: #0369a1;">💡 Backup-information</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Backup-filen är bifogad till detta email</li>
              <li>Denna backup körs automatiskt varje dag</li>
              <li>Användardata inkluderas INTE av säkerhetsskäl</li>
              <li>Spara backup-filen på en säker plats</li>
            </ul>
          </div>
          
          <hr style="margin: 24px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            Detta är en automatisk backup från Handbok-systemet. 
            Nästa backup kommer att skickas imorgon vid samma tid.
          </p>
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

        console.log('✅ Automatisk backup-email skickat:', emailResult.data?.id);

      } catch (emailError) {
        console.error('❌ Fel vid skickning av automatisk backup-email:', emailError);
        emailResult = { error: emailError instanceof Error ? emailError.message : 'Okänt email-fel' };
      }
    }

    // Logga framgångsrik backup för monitoring
    console.log('🎉 Automatisk daglig backup slutförd framgångsrikt');

    return NextResponse.json({
      success: true,
      backup: {
        id: backupData.metadata.id,
        created_at: backupData.metadata.created_at,
        size_bytes: backupData.metadata.size_bytes,
        table_counts: backupData.metadata.table_counts,
        filename: filename,
        type: 'scheduled'
      },
      email: emailResult,
      message: 'Automatisk daglig backup slutförd framgångsrikt'
    });

  } catch (error) {
    console.error('❌ Fel vid automatisk daglig backup:', error);
    
    // Skicka fel-notifiering via email om möjligt
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        await resend.emails.send({
          from: 'backup@handbok.org',
          to: process.env.ADMIN_EMAIL,
          subject: '🚨 Fel vid automatisk backup',
          html: `
            <h2>🚨 Fel vid automatisk backup</h2>
            <p>Den automatiska dagliga backup-processen misslyckades.</p>
            
            <h3>Fel-information:</h3>
            <pre style="background-color: #fee2e2; padding: 16px; border-radius: 6px; overflow-x: auto;">
${error instanceof Error ? error.message : 'Okänt fel'}
            </pre>
            
            <p>Vänligen kontrollera systemet och kör en manuell backup om nödvändigt.</p>
            
            <hr>
            <p><small>Detta är en automatisk fel-notifiering från Handbok-systemet.</small></p>
          `
        });
      } catch (emailError) {
        console.error('❌ Kunde inte skicka fel-notifiering via email:', emailError);
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Fel vid automatisk daglig backup',
        details: error instanceof Error ? error.message : 'Okänt fel',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET-endpoint för att kontrollera cron-status
export async function GET(request: NextRequest) {
  try {
    // Enkel hälsokontroll för cron-systemet
    const backupManager = new DatabaseBackupManager();
    const stats = await backupManager.getBackupStatistics();

    return NextResponse.json({
      success: true,
      status: 'Cron-system fungerar',
      lastCheck: new Date().toISOString(),
      databaseStats: {
        totalRecords: stats.totalRecords,
        estimatedSize: stats.estimatedSize,
        lastBackup: stats.lastBackupDate
      },
      cronConfig: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasAdminEmail: !!process.env.ADMIN_EMAIL,
        hasCronToken: !!process.env.CRON_SECRET_TOKEN
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Fel vid cron-hälsokontroll',
        details: error instanceof Error ? error.message : 'Okänt fel'
      },
      { status: 500 }
    );
  }
} 