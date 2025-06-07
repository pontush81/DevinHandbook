import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'edge';
export const preferredRegion = ['arn1']; // Stockholm region

/**
 * API endpoint for checking if a handbook with a specific slug exists
 * Usage: /api/check-handbook?subdomain=abc (parameter name kept for backward compatibility)
 */
export async function GET(request: NextRequest) {
  try {
    // Get subdomain from query parameters (parameter name kept for backward compatibility)
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
    
    console.log(`Checking handbook with slug: ${subdomain}`);
    
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
    
    // Query the database using 'slug' instead of 'subdomain'
    const { data, error } = await supabase
      .from('handbooks')
      .select('id, title, slug, published, created_at')  // Changed from 'subdomain' to 'slug'
      .eq('slug', subdomain)  // Changed from 'subdomain' to 'slug'
      .single();
    
    if (error) {
      console.error(`Error checking handbook: ${error.message}`);
      
      if (error.code === 'PGRST116') {
        // PGRST116 means no rows returned
        return NextResponse.json(
          { 
            success: false, 
            exists: false,
            message: `No handbook found with slug "${subdomain}"` 
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
    
    // Return the handbook data with new URL structure
    return NextResponse.json(
      { 
        success: true, 
        exists: true,
        message: `Handbook found with slug "${subdomain}"`,
        handbook: {
          ...data,
          subdomain: data.slug  // Map slug back to subdomain for backward compatibility
        },
        url: `https://www.handbok.org/${data.slug}`  // Use new URL structure
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