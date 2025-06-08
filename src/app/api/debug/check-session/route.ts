import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Hämta session från server
    const serverSession = await getServerSession();
    
    // Hämta session med service client
    const supabase = getServiceSupabase();
    
    let allUsers = [];
    try {
      // Hämta alla användare för jämförelse (begränsat antal)
      const { data: authUsers, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 50
      });
      
      if (!error && authUsers?.users) {
        allUsers = authUsers.users.map(user => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at
        }));
      }
    } catch (e) {
      console.error('Kunde inte hämta användarlista:', e);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      serverSession: serverSession ? {
        userId: serverSession.user?.id,
        email: serverSession.user?.email,
        expiresAt: serverSession.expires_at,
        createdAt: serverSession.user?.created_at
      } : null,
      allUsers: allUsers,
      sessionExists: !!serverSession,
      cookieInfo: {
        headers: Object.fromEntries(request.headers.entries()),
        cookies: request.headers.get('cookie')
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 