import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token || token.length < 32) {
      return NextResponse.json(
        { error: 'Ogiltig nedladdningstoken' },
        { status: 400 }
      );
    }

    // Hämta export-information baserat på token
    const { data: exportData, error: exportError } = await supabase
      .from('gdpr_exports')
      .select('*')
      .eq('download_token', token)
      .eq('status', 'ready')
      .single();

    if (exportError || !exportData) {
      return NextResponse.json(
        { error: 'Export hittades inte eller har gått ut' },
        { status: 404 }
      );
    }

    // Kontrollera om exporten har gått ut
    if (new Date() > new Date(exportData.expires_at)) {
      // Markera som utgången
      await supabase
        .from('gdpr_exports')
        .update({ status: 'expired' })
        .eq('id', exportData.id);

      return NextResponse.json(
        { error: 'Nedladdningslänken har gått ut' },
        { status: 410 }
      );
    }

    // Kontrollera nedladdningslimit
    if (exportData.download_count >= exportData.max_downloads) {
      return NextResponse.json(
        { error: 'Maximalt antal nedladdningar uppnått' },
        { status: 429 }
      );
    }

    // Hämta användardata för exporten
    const userData = await generateExportContent(exportData.user_id, exportData);

    // Uppdatera nedladdningsräknare
    await supabase
      .from('gdpr_exports')
      .update({ 
        download_count: exportData.download_count + 1
      })
      .eq('id', exportData.id);

    // Logga nedladdningen
    await supabase.rpc('log_user_activity', {
      p_action: 'gdpr_export_downloaded',
      p_resource_type: 'gdpr_export',
      p_resource_id: exportData.id,
      p_metadata: {
        download_count: exportData.download_count + 1,
        file_format: exportData.file_format,
        export_type: exportData.export_type
      }
    });

    // Förbered fil för nedladdning
    const content = exportData.file_format === 'json' 
      ? JSON.stringify(userData, null, 2)
      : convertToCSV(userData);

    const filename = `handbok-data-export-${new Date().toISOString().split('T')[0]}.${exportData.file_format}`;

    // Returnera filen
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': exportData.file_format === 'json' 
          ? 'application/json' 
          : 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(content, 'utf8').toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('GDPR Download Error:', error);
    return NextResponse.json(
      { error: 'Kunde inte ladda ner export' },
      { status: 500 }
    );
  }
}

async function generateExportContent(userId: string, exportData: any) {
  const userData: any = {
    export_info: {
      generated_at: new Date().toISOString(),
      user_id: userId,
      export_type: exportData.export_type,
      file_format: exportData.file_format,
      data_snapshot_at: exportData.data_snapshot_at
    }
  };

  // Grundläggande användardata
  const { data: userProfile } = await supabase.auth.admin.getUserById(userId);
  if (userProfile.user) {
    userData.user_profile = {
      id: userProfile.user.id,
      email: userProfile.user.email,
      created_at: userProfile.user.created_at,
      updated_at: userProfile.user.updated_at,
      last_sign_in_at: userProfile.user.last_sign_in_at,
      email_confirmed_at: userProfile.user.email_confirmed_at
    };
  }

  // Handböcker
  const { data: handbooks } = await supabase
    .from('handbooks')
    .select(`
      id,
      title,
      description,
      subdomain,
      created_at,
      updated_at,
      published,
      owner_id,
      organization_name,
      organization_email,
      sections(
        id,
        title,
        description,
        created_at,
        pages(
          id,
          title,
          content,
          created_at,
          updated_at
        )
      ),
      handbook_members(
        role,
        created_at
      )
    `)
    .or(`owner_id.eq.${userId},handbook_members.user_id.eq.${userId}`);

  userData.handbooks = handbooks?.map(handbook => ({
    ...handbook,
    user_role: handbook.owner_id === userId ? 'owner' : 
      handbook.handbook_members?.find(m => m.user_id === userId)?.role || 'member'
  })) || [];

  // GDPR-förfrågningar
  const { data: gdprRequests } = await supabase
    .from('gdpr_requests')
    .select('id, request_type, status, requested_at, completed_at, request_details')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });

  userData.gdpr_requests = gdprRequests || [];

  // Samtycken
  const { data: consents } = await supabase
    .from('user_consents')
    .select('consent_type, granted, granted_at, withdrawn_at, consent_method, legal_basis')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });

  userData.consents = consents || [];

  // Aktivitetslogg (bara de senaste 90 dagarna)
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('created_at, action, resource_type, success, metadata')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(500);

  userData.recent_activity = auditLogs?.map(log => ({
    date: log.created_at,
    action: log.action,
    resource_type: log.resource_type,
    success: log.success,
    details: log.metadata
  })) || [];

  // Datasammanfattning
  userData.data_summary = {
    total_handbooks: userData.handbooks.length,
    owned_handbooks: userData.handbooks.filter((h: any) => h.user_role === 'owner').length,
    member_handbooks: userData.handbooks.filter((h: any) => h.user_role !== 'owner').length,
    total_pages: userData.handbooks.reduce((sum: number, h: any) => 
      sum + (h.sections?.reduce((sSum: number, s: any) => sSum + (s.pages?.length || 0), 0) || 0), 0),
    total_gdpr_requests: userData.gdpr_requests.length,
    active_consents: userData.consents.filter((c: any) => c.granted && !c.withdrawn_at).length,
    recent_activity_count: userData.recent_activity.length
  };

  return userData;
}

function convertToCSV(data: any): string {
  const lines = [];
  
  // Header
  lines.push('Export Information');
  lines.push(`Generated At,${data.export_info.generated_at}`);
  lines.push(`User ID,${data.export_info.user_id}`);
  lines.push(`Export Type,${data.export_info.export_type}`);
  lines.push('');
  
  // User Profile
  lines.push('User Profile');
  lines.push('Field,Value');
  if (data.user_profile) {
    Object.entries(data.user_profile).forEach(([key, value]) => {
      lines.push(`${key},${value || 'N/A'}`);
    });
  }
  lines.push('');
  
  // Data Summary
  lines.push('Data Summary');
  lines.push('Metric,Count');
  if (data.data_summary) {
    Object.entries(data.data_summary).forEach(([key, value]) => {
      lines.push(`${key},${value}`);
    });
  }
  lines.push('');
  
  // Handbooks
  if (data.handbooks && data.handbooks.length > 0) {
    lines.push('Handbooks');
    lines.push('Title,Role,Created,Published,Pages Count');
    data.handbooks.forEach((handbook: any) => {
      const pageCount = handbook.sections?.reduce((sum: number, s: any) => 
        sum + (s.pages?.length || 0), 0) || 0;
      lines.push(`"${handbook.title}",${handbook.user_role},${handbook.created_at},${handbook.published},${pageCount}`);
    });
    lines.push('');
  }
  
  // GDPR Requests
  if (data.gdpr_requests && data.gdpr_requests.length > 0) {
    lines.push('GDPR Requests');
    lines.push('Type,Status,Requested At,Completed At');
    data.gdpr_requests.forEach((request: any) => {
      lines.push(`${request.request_type},${request.status},${request.requested_at},${request.completed_at || 'N/A'}`);
    });
    lines.push('');
  }
  
  // Consents
  if (data.consents && data.consents.length > 0) {
    lines.push('Consents');
    lines.push('Type,Granted,Granted At,Withdrawn At,Method');
    data.consents.forEach((consent: any) => {
      lines.push(`${consent.consent_type},${consent.granted},${consent.granted_at},${consent.withdrawn_at || 'N/A'},${consent.consent_method || 'N/A'}`);
    });
  }
  
  return lines.join('\n');
} 