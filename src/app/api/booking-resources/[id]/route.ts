import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getHybridAuth } from '@/lib/standard-auth';
import { BookingApiResponse } from '@/types/booking';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT - Uppdatera resurs
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const resourceId = params.id;

    // Kontrollera autentisering
    const authResult = await getHybridAuth(request);
    if (!authResult.userId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 });
    }

    // Kontrollera behörighet
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id')
      .eq('user_id', authResult.userId)
      .eq('handbook_id', body.handbook_id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte medlem av denna handbok' 
      }, { status: 403 });
    }

    if (!['admin', 'owner'].includes(memberData.role)) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Saknar behörighet för att uppdatera resurser' 
      }, { status: 403 });
    }

    // Uppdatera resursen
    const { data, error } = await supabase
      .from('booking_resources')
      .update({
        name: body.name,
        description: body.description,
        max_duration_hours: body.max_duration_hours,
        capacity: body.capacity,
        updated_at: new Date().toISOString()
      })
      .eq('id', resourceId)
      .eq('handbook_id', body.handbook_id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating resource:', error);
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte uppdatera resurs' 
      }, { status: 500 });
    }

    return NextResponse.json<BookingApiResponse>({ 
      success: true, 
      data 
    });

  } catch (error) {
    console.error('Error updating booking resource:', error);
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Serverfel vid uppdatering av resurs' 
    }, { status: 500 });
  }
}

// DELETE - Radera resurs
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resourceId = params.id;
    const { searchParams } = new URL(request.url);
    const handbookId = searchParams.get('handbook_id');

    if (!handbookId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'handbook_id krävs' 
      }, { status: 400 });
    }

    // Kontrollera autentisering
    const authResult = await getHybridAuth(request);
    if (!authResult.userId) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte autentiserad' 
      }, { status: 401 });
    }

    // Kontrollera behörighet
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('handbook_id, role, id')
      .eq('user_id', authResult.userId)
      .eq('handbook_id', handbookId)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Inte medlem av denna handbok' 
      }, { status: 403 });
    }

    if (!['admin', 'owner'].includes(memberData.role)) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Saknar behörighet för att radera resurser' 
      }, { status: 403 });
    }

    // Kontrollera om det finns aktiva bokningar
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('resource_id', resourceId)
      .gte('end_time', new Date().toISOString());

    if (bookingsError) {
      console.error('Error checking bookings:', bookingsError);
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte kontrollera aktiva bokningar' 
      }, { status: 500 });
    }

    if (bookings && bookings.length > 0) {
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kan inte radera resurs med aktiva bokningar' 
      }, { status: 400 });
    }

    // Radera resursen
    const { error } = await supabase
      .from('booking_resources')
      .delete()
      .eq('id', resourceId)
      .eq('handbook_id', handbookId);

    if (error) {
      console.error('Supabase error deleting resource:', error);
      return NextResponse.json<BookingApiResponse>({ 
        success: false, 
        error: 'Kunde inte radera resurs' 
      }, { status: 500 });
    }

    return NextResponse.json<BookingApiResponse>({ 
      success: true
    });

  } catch (error) {
    console.error('Error deleting booking resource:', error);
    return NextResponse.json<BookingApiResponse>({ 
      success: false, 
      error: 'Serverfel vid radering av resurs' 
    }, { status: 500 });
  }
} 