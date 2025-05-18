import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// This endpoint is designed to be temporary and will create
// the ABC handbook directly without requiring authentication
export async function GET(request: NextRequest) {
  try {
    const subdomain = 'abc';
    const title = 'ABC Handbook';
    
    const supabase = getServiceSupabase();
    
    // Check if handbook already exists
    const { data: existingHandbook, error: checkError } = await supabase
      .from('handbooks')
      .select('id, title')
      .eq('subdomain', subdomain)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing handbook:', checkError);
      return NextResponse.json({ 
        success: false, 
        message: 'Database error when checking existing handbook',
        details: checkError.message
      }, { status: 500 });
    }
    
    // If handbook already exists, return it
    if (existingHandbook) {
      return NextResponse.json({ 
        success: true, 
        message: 'Handbook already exists',
        handbook: existingHandbook,
        url: `https://${subdomain}.handbok.org`
      }, { status: 200 });
    }
    
    // Create the handbook
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .insert({
        title,
        subdomain,
        published: true
      })
      .select()
      .single();
      
    if (handbookError) {
      console.error('Error creating handbook:', handbookError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create handbook',
        details: handbookError.message
      }, { status: 500 });
    }
    
    // Create default welcome section
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .insert({
        title: 'Welcome',
        description: 'Welcome to this handbook',
        order: 0,
        handbook_id: handbook.id
      })
      .select()
      .single();
      
    if (sectionError) {
      console.error('Error creating section:', sectionError);
      // Continue anyway, we at least created the handbook
    }
    
    // Create default welcome page if section was created
    if (section) {
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .insert({
          title: 'Welcome',
          content: `# Welcome to ${title}\n\nThis is the start page for your handbook.`,
          order: 0,
          section_id: section.id
        });
        
      if (pageError) {
        console.error('Error creating page:', pageError);
        // Continue anyway
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Handbook created successfully',
      handbook_id: handbook.id,
      subdomain,
      url: `https://${subdomain}.handbok.org`
    }, { status: 201 });
    
  } catch (error) {
    console.error('Unexpected error creating handbook:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// För att undvika CORS-problem vid lokalt testande
export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    } 
  });
} 