// =============================================
// BOOKINGS API ENDPOINT
// Integreras med befintlig handbook/member-struktur
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { BookingInsert, BookingSearchParams, BookingApiResponse } from '@/types/booking'

// GET /api/bookings - Hämta bokningar
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const searchParams = request.nextUrl.searchParams
    const handbookId = searchParams.get('handbook_id')

    if (!handbookId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'handbook_id saknas' 
      }, { status: 400 })
    }

    // Kontrollera autentisering
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 })
    }

    // Kontrollera medlemskap i handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id, name')
      .eq('user_id', user.id)
      .eq('handbook_id', handbookId)
      .eq('status', 'active')
      .single()

    if (memberError || !memberData) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte medlem i denna handbook' 
      }, { status: 403 })
    }

    // Hämta bokningar med resursinfo
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        resource:booking_resources(id, name, location, type),
        member:handbook_members!inner(id, name)
      `)
      .eq('handbook_id', handbookId)
      .order('start_time', { ascending: true })

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte hämta bokningar' 
      }, { status: 500 })
    }

    return NextResponse.json<BookingApiResponse>({ 
      success: true, 
      data: bookings 
    })

  } catch (error) {
    console.error('GET /api/bookings error:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Serverfel' 
    }, { status: 500 })
  }
}

// POST /api/bookings - Skapa ny bokning
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabase()
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
        error: 'Inte medlem i någon handbook' 
      }, { status: 403 })
    }

    // Validera att resursen tillhör samma handbook
    const { data: resource, error: resourceError } = await supabase
      .from('booking_resources')
      .select('handbook_id, name')
      .eq('id', body.resource_id)
      .eq('handbook_id', memberData.handbook_id)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Resursen finns inte eller tillhör inte din handbook' 
      }, { status: 404 })
    }

    // Kontrollera kollisioner
    const { data: conflicts, error: conflictError } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('resource_id', body.resource_id)
      .eq('status', 'confirmed')
      .or(`start_time.lt.${body.end_time},end_time.gt.${body.start_time}`)

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte kontrollera kollisioner' 
      }, { status: 500 })
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Tidpunkten är redan bokad' 
      }, { status: 409 })
    }

    // Skapa bokning
    const bookingData: BookingInsert = {
      handbook_id: memberData.handbook_id,
      resource_id: body.resource_id,
      member_id: memberData.id,
      start_time: body.start_time,
      end_time: body.end_time,
      purpose: body.title, // Frontend skickar 'title', databas vill ha 'purpose'
      attendees: body.attendees || 1,
      contact_phone: body.contact_phone,
      notes: body.notes,
      status: 'confirmed'
    }

    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select(`
        *,
        resource:booking_resources(id, name, location, type),
        member:handbook_members(id, name)
      `)
      .single()

    if (insertError) {
      console.error('Error creating booking:', insertError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte skapa bokning' 
      }, { status: 500 })
    }

    return NextResponse.json<BookingApiResponse>({ 
      success: true, 
      data: newBooking 
    })

  } catch (error) {
    console.error('POST /api/bookings error:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Serverfel' 
    }, { status: 500 })
  }
}

// DELETE /api/bookings - Ta bort bokning
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const searchParams = request.nextUrl.searchParams
    const bookingId = searchParams.get('id')

    if (!bookingId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Boknings-ID saknas' 
      }, { status: 400 })
    }

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
        error: 'Inte medlem i någon handbook' 
      }, { status: 403 })
    }

    // Kontrollera att bokningen existerar och tillhör användarens handbook
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, member_id, handbook_id, start_time')
      .eq('id', bookingId)
      .eq('handbook_id', memberData.handbook_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Bokningen finns inte eller tillhör inte din handbook' 
      }, { status: 404 })
    }

    // Kontrollera behörighet - användaren kan bara ta bort sina egna bokningar, eller om de är admin/owner
    const canDelete = 
      booking.member_id === memberData.id || 
      memberData.role === 'owner' || 
      memberData.role === 'admin'

    if (!canDelete) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Du har inte behörighet att ta bort denna bokning' 
      }, { status: 403 })
    }

    // Kontrollera att bokningen inte redan har startat (graceperiod på 30 min)
    const now = new Date()
    const startTime = new Date(booking.start_time)
    const timeDiff = startTime.getTime() - now.getTime()
    const minutesDiff = timeDiff / (1000 * 60)

    if (minutesDiff < 30) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Bokningen kan inte avbokas mindre än 30 minuter före start' 
      }, { status: 400 })
    }

    // Ta bort bokningen
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('handbook_id', memberData.handbook_id)

    if (deleteError) {
      console.error('Error deleting booking:', deleteError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte ta bort bokning' 
      }, { status: 500 })
    }

    return NextResponse.json<BookingApiResponse>({ 
      success: true, 
      data: { id: bookingId, deleted: true } 
    })

  } catch (error) {
    console.error('DELETE /api/bookings error:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Serverfel' 
    }, { status: 500 })
  }
} 