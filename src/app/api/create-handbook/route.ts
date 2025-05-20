import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';

export async function POST(request: NextRequest) {
  // Verify API key for security (optional in development)
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.ADMIN_API_KEY || 'handbok-secret-key';
  
  // Simple API key check - improve this in production
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== apiKey) {
    return NextResponse.json({ 
      success: false, 
      message: 'Unauthorized' 
    }, { status: 401 });
  }
  
  try {
    // Parse the request body
    const requestBody = await request.json();
    const subdomain = requestBody.subdomain;
    // Support both 'title' and 'name' for backwards compatibility
    const title = requestBody.title || requestBody.name;
    
    // Validate required fields
    if (!subdomain || !title) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: subdomain and title are required' 
      }, { status: 400 });
    }
    
    // Validate subdomain format (lowercase letters, numbers, hyphens)
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid subdomain format' 
      }, { status: 400 });
    }
    
    const supabase = getServiceSupabase();
    
    // Check if handbook with this subdomain already exists
    const { data: existingHandbook, error: checkError } = await supabase
      .from('handbooks')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking for existing handbook:', checkError);
      return NextResponse.json({ 
        success: false, 
        message: 'Database error when checking existing handbook',
        details: checkError.message
      }, { status: 500 });
    }
    
    if (existingHandbook) {
      return NextResponse.json({ 
        success: false, 
        message: 'A handbook with this subdomain already exists',
        handbook_id: existingHandbook.id,
        subdomain
      }, { status: 409 });
    }
    
    // Hämta userId från request/session om möjligt
    let userId = null;
    // Om du har ett sätt att hämta userId från session eller JWT, gör det här
    // t.ex. userId = getUserIdFromRequest(request);

    // Skapa handboken
    const handbookId = await createHandbookWithSectionsAndPages(title, subdomain, /* template */ { sections: [] }, userId);
    
    // Create default welcome section
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .insert({
        title: 'Welcome',
        description: 'Welcome to this handbook',
        order: 0,
        handbook_id: handbookId
      })
      .select()
      .single();
      
    if (sectionError) {
      console.error('Error creating section:', sectionError);
      // Continue anyway, we at least created the handbook
    }
    
    // Create default welcome page if section was created
    if (section) {
      const { error: pageError } = await supabase
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
      handbook_id: handbookId,
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    } 
  });
}