// =============================================
// FÖRENKLAD BOOKINGS API ENDPOINT
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { getHybridAuth } from '@/lib/standard-auth'
import { BookingInsert, BookingApiResponse } from '@/types/booking'
import { 
  validateSimplifiedBooking, 
  detectSimplifiedCollisions, 
  convertToSwedishTime, 
  convertFromSwedishTime, 
  SIMPLIFIED_RESOURCE_TEMPLATES,
  SIMPLIFIED_RESOURCE_TYPES
} from '@/lib/booking-standards'

// Hjälpfunktion för att konvertera strängar till numeriska lock IDs
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Konvertera till 32-bit integer
  }
  // Säkerställ att värdet är positivt och inom int32-range
  return Math.abs(hash) % 2147483647;
}

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
      .select('handbook_id, name, resource_type')
      .eq('id', body.resource_id)
      .eq('handbook_id', body.handbook_id)
      .single()

    if (resourceError || !resource) {
      console.error('Resource lookup error:', resourceError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Resursen finns inte eller tillhör inte din handbook' 
      }, { status: 404 })
    }

    // FÖRENKLAD: Timezone-säker validering med svensk tid
    const resourceType = resource.resource_type || 'other';
    
    // Konvertera från frontend datetime-local (svensk tid) till UTC för databas
    const localStartTime = new Date(body.start_time);
    const localEndTime = new Date(body.end_time);
    const startTime = convertFromSwedishTime(localStartTime);
    const endTime = convertFromSwedishTime(localEndTime);
    
    // Validera att starttid inte är i det förflutna (i svensk tid)
    const nowSwedish = convertToSwedishTime(new Date());
    const startTimeSwedish = convertToSwedishTime(startTime);
    
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
      .eq('status', 'active')
      .gte('start_time', new Date().toISOString())

    if (userBookingsError) {
      console.error('Error checking user bookings:', userBookingsError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte kontrollera befintliga bokningar' 
      }, { status: 500 })
    }

    // FÖRENKLAD: Kör validering med förenklade regler
    const validation = validateSimplifiedBooking(
      {
        resource_id: body.resource_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        user_id: authResult.userId
      },
      { resource_type: resourceType as keyof typeof SIMPLIFIED_RESOURCE_TYPES },
      userBookings || []
    );

    if (!validation.isValid) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: validation.errors[0],
        validation_errors: validation.errors
      }, { status: 400 })
    }

    // FÖRENKLAD: Kör kollisionsdetektering
    const hasCollision = await detectSimplifiedCollisions(
      body.resource_id,
      startTime.toISOString(),
      endTime.toISOString()
    );

    if (hasCollision) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Tiden är redan bokad eller konfliktar med befintlig bokning' 
      }, { status: 400 })
    }

    // RACE CONDITION PROTECTION: Använd advisory locks
    const lockId = hashStringToNumber(`${body.resource_id}-${startTime.toISOString()}`);
    
    // Försök att få exclusive lock (väntar max 3 sekunder)
    const { data: lockResult, error: lockError } = await supabase
      .rpc('pg_try_advisory_lock', { key: lockId });

    if (lockError || !lockResult) {
      console.error('Lock acquisition failed:', lockError);
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte säkra bokningen. Försök igen.' 
      }, { status: 409 })
    }

    try {
      // Dubbelkolla kollisioner inne i låset
      const finalCollisionCheck = await detectSimplifiedCollisions(
        body.resource_id,
        startTime.toISOString(),
        endTime.toISOString()
      );

      if (finalCollisionCheck) {
        return NextResponse.json<BookingApiResponse>({ 
          success: false, 
          error: 'Tiden bokades precis av någon annan. Försök igen.' 
        }, { status: 409 })
      }

      // Skapa bokning
      const bookingData: BookingInsert = {
        resource_id: body.resource_id,
        user_id: authResult.userId,
        handbook_id: body.handbook_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        purpose: body.purpose || 'Bokning',
        attendees: body.attendees || 1,
        contact_phone: body.contact_phone || null,
        status: 'active',
        notes: body.notes || null
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single()

      if (bookingError) {
        console.error('Error creating booking:', bookingError)
        return NextResponse.json<BookingApiResponse>({ 
          success: false, 
          error: 'Kunde inte skapa bokning' 
        }, { status: 500 })
      }

      // NYTT: Skicka bekräftelsemail
      try {
        // Hämta användarens email och handbokens detaljer
        const { data: userProfile } = await supabase
          .from('handbook_members')
          .select(`
            name,
            auth_users:user_id(email),
            handbooks:handbook_id(name, slug)
          `)
          .eq('user_id', authResult.userId)
          .eq('handbook_id', body.handbook_id)
          .single()

        if (userProfile?.auth_users?.email) {
          const { sendBookingConfirmation } = await import('@/lib/booking-notifications')
          
          await sendBookingConfirmation({
            booking: booking as any,
            userEmail: userProfile.auth_users.email,
            handbookName: userProfile.handbooks?.name || 'Handbok',
            resourceName: resource.name,
            handbookSlug: userProfile.handbooks?.slug || 'handbok'
          })
          
          console.log('✅ Booking confirmation email sent to:', userProfile.auth_users.email)
        }
      } catch (emailError) {
        console.warn('⚠️ Failed to send booking confirmation email:', emailError)
        // Fortsätt ändå - email-fel ska inte stoppa bokningen
      }

      return NextResponse.json<BookingApiResponse>({ 
        success: true, 
        data: booking 
      })

    } finally {
      // Frigör låset
      await supabase.rpc('pg_advisory_unlock', { key: lockId });
    }

  } catch (error) {
    console.error('POST /api/bookings error:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Serverfel' 
    }, { status: 500 })
  }
}

// DELETE /api/bookings - Radera bokning
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const searchParams = request.nextUrl.searchParams
    const bookingId = searchParams.get('id')

    if (!bookingId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Booking ID saknas' 
      }, { status: 400 })
    }

    // Kontrollera autentisering
    const authResult = await getHybridAuth(request)
    if (!authResult.userId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 })
    }

    // Hämta bokning för att kontrollera ägarskap
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, handbook_id, start_time')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Bokning finns inte' 
      }, { status: 404 })
    }

    // Kontrollera att användaren äger bokningen eller är admin
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('role')
      .eq('user_id', authResult.userId)
      .eq('handbook_id', booking.handbook_id)
      .single()

    const isOwner = booking.user_id === authResult.userId
    const isAdmin = memberData?.role === 'admin' || memberData?.role === 'owner'

    if (!isOwner && !isAdmin) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Du kan bara radera dina egna bokningar' 
      }, { status: 403 })
    }

    // Radera bokning
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)

    if (deleteError) {
      console.error('Error deleting booking:', deleteError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte radera bokning' 
      }, { status: 500 })
    }

    return NextResponse.json<BookingApiResponse>({ 
      success: true, 
      data: { message: 'Bokning raderad' } 
    })

  } catch (error) {
    console.error('DELETE /api/bookings error:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Serverfel' 
    }, { status: 500 })
  }
} 