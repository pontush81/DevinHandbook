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
    
    // Om userId finns, säkerställ att användaren är admin för handboken
    if (userId) {
      const { error: permError } = await supabase
        .from('handbook_permissions')
        .insert({
          handbook_id: handbookId,
          owner_id: userId,
          role: 'admin',
        });
        
      if (permError) {
        console.error('[API] Kunde inte lägga till skaparen som admin:', permError);
        // Fortsätt ändå, vi har åtminstone skapat handboken
      }
    }
    
    // Create default welcome section
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .insert({
        title: 'Välkommen',
        description: 'Välkommen till föreningens digitala handbok! Här hittar du all viktig information om ditt boende och föreningen.',
        order_index: 0,
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
          title: 'Om föreningen',
          content: `# Om vår förening\n\nHär finner du grundläggande information om ${title}, inklusive historia, vision och kontaktuppgifter.\n\n## Fakta om föreningen\n\n- **Bildad år:** [Årtal]\n- **Antal lägenheter:** [Antal]\n- **Adress:** [Föreningens adress]\n- **Organisationsnummer:** [Org.nr]`,
          order_index: 0,
          section_id: section.id,
          slug: 'om-foreningen'
        });
        
      if (pageError) {
        console.error('Error creating page:', pageError);
        // Continue anyway
      }
      
      // Skapa en ytterligare sida för nya medlemmar
      const { error: secondPageError } = await supabase
        .from('pages')
        .insert({
          title: 'För nya medlemmar',
          content: `# Information för nya medlemmar\n\nDetta avsnitt innehåller praktisk information som är särskilt användbar för dig som är ny medlem i föreningen.\n\n## Viktigt att känna till\n\n- Styrelsen håller möten regelbundet\n- Felanmälan görs via [metod för felanmälan]\n- I denna handbok hittar du svar på många vanliga frågor om boendet`,
          order_index: 1,
          section_id: section.id,
          slug: 'for-nya-medlemmar'
        });
        
      if (secondPageError) {
        console.error('Error creating second page:', secondPageError);
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