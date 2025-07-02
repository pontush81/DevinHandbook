// =============================================
// BOOKING METRICS API ENDPOINT
// Admin dashboard data for booking analytics
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { getHybridAuth } from '@/lib/standard-auth'

interface BookingMetrics {
  totalBookings: number;
  activeBookings: number;
  upcomingBookings24h: number;
  cancellationRate: number;
  noShowRate: number;
  resourceUtilization: Record<string, number>;
  peakHours: { hour: number; bookings: number }[];
  topUsers: { userId: string; userName: string; bookingCount: number }[];
  recentActivity: {
    id: string;
    type: 'booking_created' | 'booking_cancelled' | 'no_show';
    resourceName: string;
    userName: string;
    timestamp: Date;
  }[];
}

// GET /api/booking-metrics - Hämta bokningsmetrics för admin dashboard
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const searchParams = request.nextUrl.searchParams
    const handbookId = searchParams.get('handbook_id')
    const timeframe = searchParams.get('timeframe') || 'month'

    if (!handbookId) {
      return NextResponse.json({ 
        success: false, 
        error: 'handbook_id saknas' 
      }, { status: 400 })
    }

    // Kontrollera autentisering
    const authResult = await getHybridAuth(request)
    if (!authResult.userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 })
    }

    // Kontrollera att användaren är admin/owner
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id, name')
      .eq('user_id', authResult.userId)
      .eq('handbook_id', handbookId)
      .eq('status', 'active')
      .single()

    if (memberError || !memberData || !['owner', 'admin'].includes(memberData.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Inte behörig för metrics' 
      }, { status: 403 })
    }

    // Beräkna tidsintervall
    const now = new Date()
    let startDate = new Date()
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3)
        break
    }

    // 1. Totala bokningar
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('handbook_id', handbookId)
      .gte('created_at', startDate.toISOString())

    // 2. Aktiva bokningar (pågående just nu)
    const { count: activeBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('handbook_id', handbookId)
      .eq('status', 'confirmed')
      .lte('start_time', now.toISOString())
      .gte('end_time', now.toISOString())

    // 3. Kommande bokningar nästa 24h
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const { count: upcomingBookings24h } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('handbook_id', handbookId)
      .eq('status', 'confirmed')
      .gte('start_time', now.toISOString())
      .lte('start_time', tomorrow.toISOString())

    // 4. Avbokningsfrekvens
    const { count: cancelledBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('handbook_id', handbookId)
      .eq('status', 'cancelled')
      .gte('created_at', startDate.toISOString())

    const cancellationRate = totalBookings ? (cancelledBookings || 0) / totalBookings * 100 : 0

    // 5. No-show frekvens (approximation - bokningar som startade men inte avbokades i tid)
    const pastBookings = await supabase
      .from('bookings')
      .select('id, start_time, status')
      .eq('handbook_id', handbookId)
      .lt('end_time', now.toISOString())
      .gte('start_time', startDate.toISOString())

    const noShows = pastBookings.data?.filter(booking => {
      // Enkel no-show logik: om bokningen startade för mer än 2h sedan och fortfarande är confirmed
      const startTime = new Date(booking.start_time)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
      return booking.status === 'confirmed' && startTime < twoHoursAgo
    }).length || 0

    const noShowRate = pastBookings.data?.length ? noShows / pastBookings.data.length * 100 : 0

    // 6. Resursanvändning
    const { data: resources } = await supabase
      .from('booking_resources')
      .select('id, name')
      .eq('handbook_id', handbookId)
      .eq('is_active', true)

    const resourceUtilization: Record<string, number> = {}
    
    if (resources) {
      for (const resource of resources) {
        const { count: resourceBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('resource_id', resource.id)
          .eq('status', 'confirmed')
          .gte('start_time', startDate.toISOString())
          .lte('start_time', now.toISOString())

        // Approximerad utilization (bokningar / möjliga slots)
        const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const possibleSlots = daysInPeriod * 12 // Antar 12 möjliga 2h-slots per dag
        
        resourceUtilization[resource.name] = possibleSlots > 0 ? (resourceBookings || 0) / possibleSlots * 100 : 0
      }
    }

    // 7. Populära tider
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('start_time')
      .eq('handbook_id', handbookId)
      .eq('status', 'confirmed')
      .gte('start_time', startDate.toISOString())

    const hourCounts: Record<number, number> = {}
    allBookings?.forEach(booking => {
      const hour = new Date(booking.start_time).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    const peakHours = Object.entries(hourCounts)
      .map(([hour, bookings]) => ({ hour: parseInt(hour), bookings }))
      .sort((a, b) => b.bookings - a.bookings)

    // 8. Mest aktiva användare
    const { data: userBookings } = await supabase
      .from('bookings')
      .select(`
        member_id,
        handbook_members!inner(name)
      `)
      .eq('handbook_id', handbookId)
      .eq('status', 'confirmed')
      .gte('start_time', startDate.toISOString())

    const userCounts: Record<string, { name: string; count: number }> = {}
    userBookings?.forEach(booking => {
      const memberId = booking.member_id
      const memberName = (booking.handbook_members as any)?.name || 'Okänd användare'
      
      if (!userCounts[memberId]) {
        userCounts[memberId] = { name: memberName, count: 0 }
      }
      userCounts[memberId].count++
    })

    const topUsers = Object.entries(userCounts)
      .map(([userId, data]) => ({
        userId,
        userName: data.name,
        bookingCount: data.count
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)

    // 9. Senaste aktivitet (förenklad)
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        created_at,
        start_time,
        booking_resources!inner(name),
        handbook_members!inner(name)
      `)
      .eq('handbook_id', handbookId)
      .order('created_at', { ascending: false })
      .limit(50)

    const recentActivity = recentBookings?.map(booking => ({
      id: booking.id,
      type: 'booking_created' as const,
      resourceName: (booking.booking_resources as any)?.name || 'Okänd resurs',
      userName: (booking.handbook_members as any)?.name || 'Okänd användare',
      timestamp: new Date(booking.created_at)
    })) || []

    const metrics: BookingMetrics = {
      totalBookings: totalBookings || 0,
      activeBookings: activeBookings || 0,
      upcomingBookings24h: upcomingBookings24h || 0,
      cancellationRate,
      noShowRate,
      resourceUtilization,
      peakHours,
      topUsers,
      recentActivity
    }

    return NextResponse.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('GET /api/booking-metrics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Serverfel'
    }, { status: 500 })
  }
}