// =============================================
// BOOKINGS API ENDPOINT
// Integreras med befintlig handbook/member-struktur
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { getHybridAuth } from '@/lib/standard-auth'
import { BookingInsert, BookingSearchParams, BookingApiResponse } from '@/types/booking'
import { validateBookingRules, detectCollisions, ResourceTemplates, FairUsageRules } from '@/lib/booking-standards'
import { sendBookingNotification } from '@/lib/booking-notifications'

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

    // Kontrollera autentisering med hybrid auth
    const authResult = await getHybridAuth(request)
    if (!authResult.userId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 })
    }

    // Kontrollera medlemskap i handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id')
      .eq('user_id', authResult.userId)
      .eq('handbook_id', handbookId)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte medlem i denna handbook' 
      }, { status: 403 })
    }

    console.log('✅ [Bookings] Membership confirmed for user:', memberData)

    // Hämta bokningar med resursinfo
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        resource:booking_resources(id, name, description)
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

    // Kontrollera autentisering med hybrid auth
    const authResult = await getHybridAuth(request)
    if (!authResult.userId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 })
    }

    // Hämta member-info
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id')
      .eq('user_id', authResult.userId)
      .eq('status', 'active')
      .single()

    if (memberError || !memberData) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte medlem i någon handbook' 
      }, { status: 403 })
    }

    // Validera att resursen tillhör samma handbook och hämta resursinfo
    const { data: resource, error: resourceError } = await supabase
      .from('booking_resources')
      .select('handbook_id, name, max_duration_hours, advance_booking_days')
      .eq('id', body.resource_id)
      .eq('handbook_id', memberData.handbook_id)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Resursen finns inte eller tillhör inte din handbook' 
      }, { status: 404 })
    }

    // Validera booking mot standardregler
    const resourceType = 'other'; // Default type since type column doesn't exist
    const startTime = new Date(body.start_time);
    const endTime = new Date(body.end_time);
    
    const validation = validateBookingRules(
      resourceType as any,
      startTime,
      endTime,
      authResult.userId,
      []
    );

    if (!validation.valid) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: validation.errors[0],
        validation_errors: validation.errors
      }, { status: 400 })
    }

    // Kontrollera användarens befintliga bokningar för fair usage
    const { data: userBookings, error: userBookingsError } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('user_id', authResult.userId) // Changed from member_id to user_id
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())

    if (userBookingsError) {
      console.error('Error checking user bookings:', userBookingsError)
    } else {
      // Kontrollera veckogräns
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Måndag
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const thisWeekBookings = userBookings?.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate >= weekStart && bookingDate < weekEnd;
      }) || [];

      const rules = ResourceTemplates[resourceType as keyof typeof ResourceTemplates];
      if (thisWeekBookings.length >= rules.maxBookingsPerUserPerWeek) {
        return NextResponse.json<BookingApiResponse>({ 
          success: false, 
          error: `Maximal antal bokningar per vecka (${rules.maxBookingsPerUserPerWeek}) överskridet` 
        }, { status: 429 })
      }
    }

    // Kontrollera kollisioner med buffer zones
    const { data: conflicts, error: conflictError } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('resource_id', body.resource_id)
      .eq('status', 'confirmed')

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte kontrollera kollisioner' 
      }, { status: 500 })
    }

    // Använd standardiserad kollisionsdetektion med buffer
    const rules = ResourceTemplates[resourceType as keyof typeof ResourceTemplates];
    const hasCollision = detectCollisions(
      startTime,
      endTime,
      conflicts || [],
      rules.cleaningBufferMinutes
    );

    if (hasCollision) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: `Tidpunkten kolliderar med befintlig bokning (inkl. ${rules.cleaningBufferMinutes}min städbuffer)` 
      }, { status: 409 })
    }

    // Skapa bokning
    const bookingData: BookingInsert = {
      handbook_id: memberData.handbook_id,
      resource_id: body.resource_id,
      user_id: authResult.userId, // Använd user_id från auth, inte member_id
      start_time: body.start_time,
      end_time: body.end_time,
      title: body.title,
      purpose: body.purpose || body.title,
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
        resource:booking_resources(id, name, description)
      `)
      .single()

    if (insertError) {
      console.error('Error creating booking:', insertError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte skapa bokning' 
      }, { status: 500 })
    }

    // Skicka bekräftelsenotifikation
    try {
      const resourceRules = ResourceTemplates[resourceType as keyof typeof ResourceTemplates];
      
      await sendBookingNotification('booking_confirmation', {
        memberEmail: (newBooking.member as any).email,
        memberPhone: (newBooking.member as any).phone,
        memberName: (newBooking.member as any).name,
        resourceName: (newBooking.resource as any).name,
        resourceLocation: (newBooking.resource as any).location,
        startTime: new Date(newBooking.start_time),
        endTime: new Date(newBooking.end_time),
        purpose: newBooking.purpose,
        cleaningFee: resourceRules.cleaningFee,
        handbookName: (newBooking.handbook as any)?.name || 'Handbok',
        handbookId: newBooking.handbook_id,
        bookingRules: (newBooking.resource as any).booking_instructions
      });
    } catch (notificationError) {
      console.error('Failed to send booking confirmation:', notificationError);
      // Don't fail the booking creation if notification fails
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

    // Kontrollera autentisering med hybrid auth
    const authResult = await getHybridAuth(request)
    if (!authResult.userId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 })
    }

    // Hämta member-info
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id')
      .eq('user_id', authResult.userId)
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
      .select(`
        id, user_id, handbook_id, start_time, end_time, purpose,
        resource:booking_resources(name)
      `)
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
      booking.user_id === authResult.userId || 
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

    // Skicka avbokningsnotifikation
    try {
      await sendBookingNotification('cancellation', {
        memberEmail: (booking.member as any).email,
        memberPhone: (booking.member as any).phone,
        memberName: (booking.member as any).name,
        resourceName: (booking.resource as any).name,
        resourceLocation: (booking.resource as any).location,
        startTime: new Date(booking.start_time),
        endTime: new Date(booking.end_time),
        purpose: booking.purpose,
        handbookName: (booking.handbook as any)?.name || 'Handbok',
        handbookId: booking.handbook_id
      });
    } catch (notificationError) {
      console.error('Failed to send cancellation notification:', notificationError);
      // Don't fail the deletion if notification fails
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