// =============================================
// BOOKING RESOURCES API ENDPOINT
// Integreras med befintlig handbook/member-struktur
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BookingResourceInsert, ResourceSearchParams, BookingApiResponse } from '@/types/booking'

// GET /api/booking-resources - Hämta bokningsresurser
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
    const params: ResourceSearchParams = {
      handbook_id: memberData.handbook_id,
      is_active: searchParams.get('is_active') === 'false' ? false : true,
      search_term: searchParams.get('search_term') || undefined,
      available_on: searchParams.get('available_on') || undefined,
      available_at: searchParams.get('available_at') || undefined,
      order_by: searchParams.get('order_by') as any || 'name',
      order_direction: searchParams.get('order_direction') as any || 'asc'
    }

    // Bygg query med statistik
    let query = supabase
      .from('booking_resources')
      .select(`
        *,
        bookings_count:bookings(count),
        next_booking:bookings(start_time, end_time)
      `)
      .eq('handbook_id', memberData.handbook_id)

    // Filtrera baserat på parametrar
    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }
    
    if (params.search_term) {
      query = query.or(`name.ilike.%${params.search_term}%,description.ilike.%${params.search_term}%,location.ilike.%${params.search_term}%`)
    }

    // Sortering
    query = query.order(params.order_by, { ascending: params.order_direction === 'asc' })

    const { data: resources, error: resourcesError } = await query

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError)
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte hämta resurser' 
      }, { status: 500 })
    }

    // Lägg till statistik för varje resurs
    const resourcesWithStats = await Promise.all(
      (resources || []).map(async (resource) => {
        // Hämta total antal bokningar
        const { count: totalBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('resource_id', resource.id)
          .eq('status', 'confirmed')

        // Hämta bokningar denna månad
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count: thisMonthBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('resource_id', resource.id)
          .eq('status', 'confirmed')
          .gte('start_time', startOfMonth.toISOString())

        // Hitta nästa tillgängliga slot (enkel version)
        const { data: nextBooking } = await supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('resource_id', resource.id)
          .eq('status', 'confirmed')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(1)
          .single()

        return {
          ...resource,
          total_bookings: totalBookings || 0,
          this_month_bookings: thisMonthBookings || 0,
          next_available_slot: nextBooking?.end_time ? new Date(nextBooking.end_time) : new Date(),
          is_available_now: !nextBooking || new Date() < new Date(nextBooking.start_time)
        }
      })
    )

    return NextResponse.json<BookingApiResponse>({
      success: true,
      data: resourcesWithStats
    })

  } catch (error) {
    console.error('Unexpected error in booking-resources GET:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Oväntat fel uppstod' 
    }, { status: 500 })
  }
}

// POST /api/booking-resources - Skapa ny resurs (endast admin/owner)
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

    // Hämta member-info och kontrollera roller
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

    // Kontrollera att användaren har rätt att skapa resurser
    if (!['owner', 'admin'].includes(memberData.role)) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Endast ägare och administratörer kan skapa resurser' 
      }, { status: 403 })
    }

    // Validera required fields
    const { name } = body
    if (!name) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Resursnamn krävs',
        validation_errors: ['name är obligatoriskt']
      }, { status: 400 })
    }

    // Validera att available_days är en array med giltiga veckodagar
    if (body.available_days && (!Array.isArray(body.available_days) || 
        !body.available_days.every((day: number) => day >= 1 && day <= 7))) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Tillgängliga dagar måste vara en array med nummer 1-7 (Måndag-Söndag)',
        validation_errors: ['available_days måste vara [1,2,3,4,5,6,7] för veckodagar']
      }, { status: 400 })
    }

    // Skapa resursdata med defaults
    const resourceData: BookingResourceInsert = {
      handbook_id: memberData.handbook_id,
      name: body.name,
      description: body.description || null,
      location: body.location || null,
      max_duration_hours: body.max_duration_hours || 2,
      max_advance_days: body.max_advance_days || 30,
      max_bookings_per_member: body.max_bookings_per_member || 3,
      available_from: body.available_from || '08:00',
      available_to: body.available_to || '22:00',
      available_days: body.available_days || [1, 2, 3, 4, 5, 6, 7], // Alla dagar som default
      requires_approval: body.requires_approval || false,
      booking_instructions: body.booking_instructions || null,
      rules: body.rules || null,
      cost_per_hour: body.cost_per_hour || null,
      cleaning_fee: body.cleaning_fee || null,
      is_active: true
    }

    // Spara resursen
    const { data: resource, error: insertError } = await supabase
      .from('booking_resources')
      .insert(resourceData)
      .select('*')
      .single()

    if (insertError) {
      console.error('Error creating resource:', insertError)
      
      // Hantera constraint violations
      if (insertError.code === '23505') { // Unique constraint
        return NextResponse.json<BookingApiResponse>({ 
          success: false, 
          error: 'En resurs med detta namn finns redan' 
        }, { status: 409 })
      }
      
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte skapa resursen' 
      }, { status: 500 })
    }

    return NextResponse.json<BookingApiResponse>({
      success: true,
      data: resource
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in booking-resources POST:', error)
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Oväntat fel uppstod' 
    }, { status: 500 })
  }
} 