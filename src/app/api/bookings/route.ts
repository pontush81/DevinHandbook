// =============================================
// BOOKINGS API ENDPOINT
// Integreras med befintlig handbook/member-struktur
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { getHybridAuth } from '@/lib/standard-auth'
import { BookingInsert, BookingSearchParams, BookingApiResponse } from '@/types/booking'
import { validateBookingRules, detectCollisions, ResourceTemplates, FairUsageRules, toSwedishTime, fromSwedishTime } from '@/lib/booking-standards'
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

    // Kontrollera att handbook_id finns i request
    if (!body.handbook_id) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'handbook_id saknas' 
      }, { status: 400 })
    }

    // Kontrollera medlemskap i den specifika handboken
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id')
      .eq('user_id', authResult.userId)
      .eq('handbook_id', body.handbook_id)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte medlem i denna handbook' 
      }, { status: 403 })
    }

    // Validera att resursen tillhör samma handbook och hämta resursinfo
    const { data: resource, error: resourceError } = await supabase
      .from('booking_resources')
      .select('handbook_id, name, max_duration_hours, advance_booking_days')
      .eq('id', body.resource_id)
      .eq('handbook_id', body.handbook_id)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Resursen finns inte eller tillhör inte din handbook' 
      }, { status: 404 })
    }

    // ENHANCED: Timezone-säker validering med svensk tid
    const resourceType = 'other'; // Default type since type column doesn't exist
    
    // Konvertera från frontend datetime-local (svensk tid) till UTC för databas
    const localStartTime = new Date(body.start_time);
    const localEndTime = new Date(body.end_time);
    const startTime = fromSwedishTime(localStartTime);
    const endTime = fromSwedishTime(localEndTime);
    
    // Validera att starttid inte är i det förflutna (i svensk tid)
    const nowSwedish = toSwedishTime(new Date());
    const startTimeSwedish = toSwedishTime(startTime);
    
    if (startTimeSwedish < nowSwedish) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Du kan inte boka datum som redan passerat. Kontrollera att din klocka är korrekt inställd.' 
      }, { status: 400 })
    }
    
    // Hämta användarens befintliga bokningar för komplett validering
    const { data: userBookings, error: userBookingsError } = await supabase
      .from('bookings')
      .select('start_time, end_time, user_id, id')
      .eq('user_id', authResult.userId)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())

    if (userBookingsError) {
      console.error('Error checking user bookings:', userBookingsError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte kontrollera befintliga bokningar' 
      }, { status: 500 })
    }

    // FIXED: Kör validering med befintliga bokningar
    const validation = validateBookingRules(
      resourceType as any,
      startTime,
      endTime,
      authResult.userId,
      userBookings || []
    );

    if (!validation.valid) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: validation.errors[0],
        validation_errors: validation.errors
      }, { status: 400 })
    }

    // FIXED: Kontrollera kollisioner med atomär transaktion för race condition-skydd
    const { data: conflicts, error: conflictError } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, user_id')
      .eq('resource_id', body.resource_id)
      .eq('status', 'confirmed')

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte kontrollera kollisioner' 
      }, { status: 500 })
    }

    // FIXED: Använd förbättrad kollisionsdetektion med svensk tid
    const rules = ResourceTemplates[resourceType as keyof typeof ResourceTemplates];
    const collisionResult = detectCollisions(
      startTime,
      endTime,
      conflicts || [],
      rules.cleaningBufferMinutes
    );

    if (collisionResult.hasCollision) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: `Tidpunkten kolliderar med befintlig bokning (inkl. ${rules.cleaningBufferMinutes}min städbuffer)`,
        collision_details: collisionResult.details
      }, { status: 409 })
    }

    // Skapa bokning med UTC-tider för databas
    const bookingData: BookingInsert = {
      handbook_id: body.handbook_id,
      resource_id: body.resource_id,
      user_id: authResult.userId, // Använd user_id från auth, inte member_id
      start_time: startTime.toISOString(), // UTC för databas
      end_time: endTime.toISOString(),     // UTC för databas
      title: body.title,
      purpose: body.purpose || body.title,
      attendees: body.attendees || 1,
      contact_phone: body.contact_phone,
      notes: body.notes,
      status: 'confirmed'
    }

    // ENHANCED: Race condition-säker insertion med final validation
    try {
      // Gör en sista kontroll direkt innan insertion för att fånga race conditions
      const { data: lastMinuteConflicts, error: lastMinuteError } = await supabase
        .from('bookings')
        .select('start_time, end_time, id')
        .eq('resource_id', body.resource_id)
        .eq('status', 'confirmed')
        .gte('end_time', body.start_time)
        .lte('start_time', body.end_time)

      if (lastMinuteError) {
        throw new Error('Last minute conflict check failed');
      }

      if (lastMinuteConflicts && lastMinuteConflicts.length > 0) {
        return NextResponse.json<BookingApiResponse>({ 
          success: false, 
          error: 'Tidsperioden blev precis bokad av någon annan. Försök med en annan tid.',
          error_code: 'RACE_CONDITION_DETECTED'
        }, { status: 409 })
      }

      // Nu är det säkert att skapa bokningen
      const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select(`
          *,
          resource:booking_resources(id, name, description)
        `)
        .single()

      if (insertError) {
        // Kolla om det är en constraint violation (race condition)
        if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
          return NextResponse.json<BookingApiResponse>({ 
            success: false, 
            error: 'Tidsperioden blev precis bokad av någon annan. Försök med en annan tid.',
            error_code: 'CONSTRAINT_VIOLATION'
          }, { status: 409 })
        }
        
        console.error('Error creating booking:', insertError)
        return NextResponse.json<BookingApiResponse>({ 
          success: false, 
          error: 'Kunde inte skapa bokning' 
        }, { status: 500 })
      }

      // Success - booking created
      const booking = newBooking;
      
    } catch (raceError) {
      console.error('Race condition during booking creation:', raceError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Ett fel uppstod vid bokning. Försök igen.',
        error_code: 'RACE_CONDITION'
      }, { status: 409 })
    }

    // Skicka bekräftelsenotifikation
    try {
      const resourceRules = ResourceTemplates[resourceType as keyof typeof ResourceTemplates];
      
      await sendBookingNotification('booking_confirmation', {
        memberEmail: (booking.member as any).email,
        memberPhone: (booking.member as any).phone,
        memberName: (booking.member as any).name,
        resourceName: (booking.resource as any).name,
        resourceLocation: (booking.resource as any).location,
        startTime: new Date(booking.start_time),
        endTime: new Date(booking.end_time),
        purpose: booking.purpose,
        cleaningFee: resourceRules.cleaningFee,
        handbookName: (booking.handbook as any)?.name || 'Handbok',
        handbookId: booking.handbook_id,
        bookingRules: (booking.resource as any).booking_instructions
      });
    } catch (notificationError) {
      console.error('Failed to send booking confirmation:', notificationError);
      // Don't fail the booking creation if notification fails
    }

    return NextResponse.json<BookingApiResponse>({ 
      success: true, 
      data: booking 
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

    // ENHANCED: Kontrollera att bokningen inte redan har startat (graceperiod på 30 min) - med svensk tid
    const nowSwedish = toSwedishTime(new Date())
    const startTimeSwedish = toSwedishTime(new Date(booking.start_time))
    const timeDiff = startTimeSwedish.getTime() - nowSwedish.getTime()
    const minutesDiff = timeDiff / (1000 * 60)

    if (minutesDiff < 30) {
      const startTimeStr = startTimeSwedish.toLocaleString('sv-SE');
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: `Bokningen kan inte avbokas mindre än 30 minuter före start. Bokningen börjar ${startTimeStr}.` 
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