import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');
    
    if (!subdomain) {
      return NextResponse.json(
        { available: false, error: 'Subdomain parameter is required' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const subdomainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainPattern.test(subdomain)) {
      return NextResponse.json(
        { 
          available: false, 
          error: 'Invalid subdomain format. Only lowercase letters, numbers, and hyphens are allowed.' 
        },
        { status: 400 }
      );
    }

    // Check minimum length
    if (subdomain.length < 2) {
      return NextResponse.json(
        { 
          available: false, 
          error: 'Subdomain must be at least 2 characters long.' 
        },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS and check if subdomain exists
    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('handbooks')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (error) {
      console.error('Error checking subdomain availability:', error);
      return NextResponse.json(
        { available: false, error: 'Database error' },
        { status: 500 }
      );
    }

    // If data exists, subdomain is taken
    const available = !data;

    return NextResponse.json(
      { 
        available,
        subdomain,
        message: available ? 'Subdomain is available' : 'Subdomain is already taken'
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );

  } catch (error) {
    console.error('Unexpected error in subdomain availability check:', error);
    return NextResponse.json(
      { available: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 