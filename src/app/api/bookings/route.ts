// =============================================
// BOOKINGS API ENDPOINT
// Integreras med befintlig handbook/member-struktur
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BookingInsert, BookingSearchParams, BookingApiResponse } from '@/types/booking'

// GET /api/bookings - Hämta bokningar
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Kontrollera autentisering
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 })
    }

    // Hämta member-info för att få handbook_id
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (memberError || !memberData) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Medlem ej hittad' 
      }, { status: 403 })
    }

    // Parse search params
    const params: BookingSearchParams = {
      resource_id: searchParams.get('resource_id') || undefined,
      member_id: searchParams.get('member_id') || undefined,
      status: searchParams.get('status')?.split(',') as any || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      search_term: searchParams.get('search_term') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      per_page: parseInt(searchParams.get('per_page') || '20'),
      order_by: searchParams.get('order_by') as any || 'start_time',
      order_direction: searchParams.get('order_direction') as any || 'asc'
    }

    // Bygg query
    let query = supabase
      .from('bookings')
      .select(`
        *,
        resource:booking_resources(id, name, description, location),
        member:handbook_members(id, name, email, role)
      `)
      .eq('handbook_id', memberData.handbook_id)

    // Filtrera baserat på parametrar
    if (params.resource_id) {
      query = query.eq('resource_id', params.resource_id)
    }
    
    if (params.member_id) {
      query = query.eq('member_id', params.member_id)
    }
    
    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status)
    }
    
    if (params.date_from) {
      query = query.gte('start_time', params.date_from)
    }
    
    if (params.date_to) {
      query = query.lte('start_time', params.date_to)
    }
    
    if (params.search_term) {
      query = query.or(`purpose.ilike.%${params.search_term}%,notes.ilike.%${params.search_term}%`)
    }

    // Sortering
    const orderColumn = params.order_by === 'resource_name' ? 'resource.name' : params.order_by
    query = query.order(orderColumn, { ascending: params.order_direction === 'asc' })

    // Paginering
    const offset = ((params.page || 1) - 1) * (params.per_page || 20)
    query = query.range(offset, offset + (params.per_page || 20) - 1)

    const { data: bookings, error: bookingsError, count } = await query

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte hämta bokningar' 
      }, { status: 500 })
    }

    return NextResponse.json<BookingApiResponse>({
      success: true,
      data: {
        data: bookings || [],
        count: count || 0,
        page: params.page || 1,
        per_page: params.per_page || 20,
        total_pages: Math.ceil((count || 0) / (params.per_page || 20))
      }
    })

  } catch (error) {
    console.error('Unexpected error in bookings GET:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Oväntat fel uppstod' 
    }, { status: 500 })
  }
}

// POST /api/bookings - Skapa ny bokning
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Kontrollera autentisering
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 })
    }

    // Hämta member-info
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id, name')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (memberError || !memberData) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Medlem ej hittad' 
      }, { status: 403 })
    }

    // Validera required fields
    const { resource_id, start_time, end_time } = body
    if (!resource_id || !start_time || !end_time) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Resurs, starttid och sluttid krävs',
        validation_errors: ['resource_id, start_time och end_time är obligatoriska']
      }, { status: 400 })
    }

    // Kontrollera att resursen finns och tillhör samma handbok
    const { data: resource, error: resourceError } = await supabase
      .from('booking_resources')
      .select('*')
      .eq('id', resource_id)
      .eq('handbook_id', memberData.handbook_id)
      .eq('is_active', true)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Resurs ej hittad eller ej tillgänglig' 
      }, { status: 404 })
    }

    // Validera tidpunkter
    const startDate = new Date(start_time)
    const endDate = new Date(end_time)
    const now = new Date()
    
    if (startDate <= now) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kan inte boka i det förflutna' 
      }, { status: 400 })
    }

    if (endDate <= startDate) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Sluttid måste vara efter starttid' 
      }, { status: 400 })
    }

    // ✅ FÖRBÄTTRAD ADVANCE BOOKING VALIDERING
    const daysDifference = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDifference > resource.max_advance_days) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: `Du kan bara boka max ${resource.max_advance_days} dagar i förväg` 
      }, { status: 400 })
    }

    // ✅ FÖRBÄTTRAD RESURSTILLGÄNGLIGHET VALIDERING
    const startHour = startDate.getHours()
    const startMinute = startDate.getMinutes()
    const endHour = endDate.getHours()
    const endMinute = endDate.getMinutes()
    const dayOfWeek = startDate.getDay() === 0 ? 7 : startDate.getDay() // Convert Sunday (0) to 7

    // Kontrollera tillgängliga dagar
    if (!resource.available_days.includes(dayOfWeek)) {
      const dayNames = ['', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag']
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: `Resursen är inte tillgänglig på ${dayNames[dayOfWeek]}` 
      }, { status: 400 })
    }

    // Kontrollera tillgängliga tider
    const [availableFromHour, availableFromMinute] = resource.available_from.split(':').map(Number)
    const [availableToHour, availableToMinute] = resource.available_to.split(':').map(Number)
    
    const startTimeMinutes = startHour * 60 + startMinute
    const endTimeMinutes = endHour * 60 + endMinute
    const availableFromMinutes = availableFromHour * 60 + availableFromMinute
    const availableToMinutes = availableToHour * 60 + availableToMinute

    if (startTimeMinutes < availableFromMinutes || endTimeMinutes > availableToMinutes) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: `Resursen är bara tillgänglig ${resource.available_from}-${resource.available_to}` 
      }, { status: 400 })
    }

    // Kontrollera maximal bokningstid
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    if (durationHours > resource.max_duration_hours) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: `Maximal bokningstid är ${resource.max_duration_hours} timmar` 
      }, { status: 400 })
    }

    // Kontrollera att medlem inte har för många aktiva bokningar
    const { count: activeBookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', memberData.id)
      .eq('status', 'confirmed')
      .gte('end_time', now.toISOString())

    if ((activeBookingsCount || 0) >= resource.max_bookings_per_member) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: `Du kan max ha ${resource.max_bookings_per_member} aktiva bokningar` 
      }, { status: 400 })
    }

    // Skapa bokningsdata - ✅ FIXAD DATA MAPPING (purpose -> title)
    const bookingData: BookingInsert = {
      resource_id,
      handbook_id: memberData.handbook_id,
      member_id: memberData.id,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: resource.requires_approval ? 'pending' : 'confirmed',
      purpose: body.title || body.purpose || null, // ✅ Accepterar både title och purpose
      attendees: body.attendees || 1,
      contact_phone: body.contact_phone || null,
      notes: body.notes || null
    }

    // Spara bokningen
    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select(`
        *,
        resource:booking_resources(id, name, description, location),
        member:handbook_members(id, name, email, role)
      `)
      .single()

    if (insertError) {
      console.error('Error creating booking:', insertError)
      
      // Hantera constraint violations
      if (insertError.code === '23P01') { // EXCLUDE constraint
        return NextResponse.json<BookingApiResponse>({ 
          success: false, 
          error: 'Resursen är redan bokad för denna tid' 
        }, { status: 409 })
      }
      
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte skapa bokningen' 
      }, { status: 500 })
    }

    return NextResponse.json<BookingApiResponse>({
      success: true,
      data: booking
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in bookings POST:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Oväntat fel uppstod' 
    }, { status: 500 })
  }
}

// ✅ DELETE /api/bookings - Ta bort bokning (HELT NY ENDPOINT)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Kontrollera autentisering
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 })
    }

    // Hämta member-info
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (memberError || !memberData) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Medlem ej hittad' 
      }, { status: 403 })
    }

    // Validera required fields
    const { booking_id } = body
    if (!booking_id) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Boknings-ID krävs',
        validation_errors: ['booking_id är obligatoriskt']
      }, { status: 400 })
    }

    // Hämta bokningen för validering
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        resource:booking_resources(name)
      `)
      .eq('id', booking_id)
      .eq('handbook_id', memberData.handbook_id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Bokning ej hittad' 
      }, { status: 404 })
    }

    // Kontrollera behörigheter - medlem kan bara ta bort sina egna bokningar
    // eller admin/owner kan ta bort alla
    const canDelete = booking.member_id === memberData.id || 
                     ['owner', 'admin'].includes(memberData.role)

    if (!canDelete) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Du har inte behörighet att ta bort denna bokning' 
      }, { status: 403 })
    }

    // Kontrollera om bokningen redan har startat
    const now = new Date()
    const startTime = new Date(booking.start_time)
    
    if (startTime <= now) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kan inte ta bort en bokning som redan har startat' 
      }, { status: 400 })
    }

    // Ta bort bokningen
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', booking_id)

    if (deleteError) {
      console.error('Error deleting booking:', deleteError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte ta bort bokningen' 
      }, { status: 500 })
    }

    return NextResponse.json<BookingApiResponse>({
      success: true,
      data: { 
        message: 'Bokning borttagen',
        deleted_booking: {
          id: booking.id,
          resource_name: booking.resource?.name,
          start_time: booking.start_time
        }
      }
    })

  } catch (error) {
    console.error('Unexpected error in bookings DELETE:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Oväntat fel uppstod' 
    }, { status: 500 })
  }
} 