import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'edge';
export const preferredRegion = ['arn1']; // Stockholm region

/**
 * API endpoint for checking if a handbook with a specific subdomain exists
 * Usage: /api/check-handbook?subdomain=abc
 */
export async function GET(request: NextRequest) {
  try {
    // Get subdomain from query parameters
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');
    
    if (!subdomain) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing subdomain parameter' 
        }, 
        { status: 400 }
      );
    }
    
    console.log(`Checking handbook with subdomain: ${subdomain}`);
    
    // Get Supabase client
    const supabase = getServiceSupabase();
    
    if (!supabase) {
      console.error('Failed to get Supabase service client');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Database connection error' 
        }, 
        { status: 500 }
      );
    }
    
    // Query the database
    const { data, error } = await supabase
      .from('handbooks')
      .select('id, title, subdomain, published, created_at')
      .eq('subdomain', subdomain)
      .single();
    
    if (error) {
      console.error(`Error checking handbook: ${error.message}`);
      
      if (error.code === 'PGRST116') {
        // PGRST116 means no rows returned
        return NextResponse.json(
          { 
            success: false, 
            exists: false,
            message: `No handbook found with subdomain "${subdomain}"` 
          }, 
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Database error',
          details: error.message
        }, 
        { status: 500 }
      );
    }
    
    // Return the handbook data
    return NextResponse.json(
      { 
        success: true, 
        exists: true,
        message: `Handbook found with subdomain "${subdomain}"`,
        handbook: data,
        url: `https://${subdomain}.handbok.org`
      }, 
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
    
  } catch (error) {
    console.error('Unexpected error checking handbook:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        details: error.message
      }, 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    } 
  });
} 