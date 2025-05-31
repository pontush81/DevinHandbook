import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';
import { checkIsSuperAdmin } from '@/lib/user-utils';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Kontrollera autentisering och admin-status
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Ej autentiserad" },
        { status: 401 }
      );
    }

    const isSuperAdmin = await checkIsSuperAdmin(
      supabase,
      session.user.id,
      session.user.email || ''
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Ej behörig" },
        { status: 403 }
      );
    }

    const adminClient = getAdminClient();
    
    // Hämta alla användare från auth.users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();
    
    if (authError) {
      console.error('[user-stats] Fel vid hämtning av auth-användare:', authError);
      return NextResponse.json(
        { error: "Kunde inte hämta användardata" },
        { status: 500 }
      );
    }

    const users = authUsers.users || [];
    
    // Beräkna tidspunkter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Filtrera användare efter tidperioder
    const usersToday = users.filter(u => 
      u.created_at && new Date(u.created_at) >= today
    );
    
    const usersYesterday = users.filter(u => 
      u.created_at && 
      new Date(u.created_at) >= yesterday && 
      new Date(u.created_at) < today
    );
    
    const usersThisWeek = users.filter(u => 
      u.created_at && new Date(u.created_at) >= weekAgo
    );
    
    const usersThisMonth = users.filter(u => 
      u.created_at && new Date(u.created_at) >= monthAgo
    );
    
    const usersThisYear = users.filter(u => 
      u.created_at && new Date(u.created_at) >= yearAgo
    );

    // Bekräftade användare (email verified)
    const confirmedUsers = users.filter(u => u.email_confirmed_at);
    
    // Beräkna månadsvis statistik för de senaste 12 månaderna
    const monthlyStats = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const monthUsers = users.filter(u => {
        if (!u.created_at) return false;
        const userDate = new Date(u.created_at);
        return userDate >= monthStart && userDate <= monthEnd;
      });

      monthlyStats.push({
        month: monthStart.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' }),
        users: monthUsers.length,
        confirmed: monthUsers.filter(u => u.email_confirmed_at).length
      });
    }

    // Senaste registrerade användare
    const recentUsers = users
      .filter(u => u.created_at)
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at,
        confirmed: !!u.email_confirmed_at
      }));

    return NextResponse.json({
      totalUsers: users.length,
      confirmedUsers: confirmedUsers.length,
      confirmationRate: users.length > 0 ? Math.round((confirmedUsers.length / users.length) * 100) : 0,
      usersToday: usersToday.length,
      usersYesterday: usersYesterday.length,
      usersThisWeek: usersThisWeek.length,
      usersThisMonth: usersThisMonth.length,
      usersThisYear: usersThisYear.length,
      growthToday: usersYesterday.length > 0 
        ? Math.round(((usersToday.length - usersYesterday.length) / usersYesterday.length) * 100)
        : 0,
      monthlyStats,
      recentUsers
    });

  } catch (error) {
    console.error('[user-stats] Oväntat fel:', error);
    return NextResponse.json(
      { error: "Internt serverfel" },
      { status: 500 }
    );
  }
} 