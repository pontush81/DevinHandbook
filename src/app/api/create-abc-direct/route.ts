import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'edge';
export const preferredRegion = ['arn1']; // Stockholm region

// This endpoint is designed to be temporary and will create
// the ABC handbook directly without requiring authentication
export async function GET(request: NextRequest) {
  try {
    const subdomain = 'abc';
    const title = 'ABC Handbook';
    
    console.log(`Starting ABC handbook creation process: ${subdomain}`);
    const supabase = getServiceSupabase();
    
    if (!supabase) {
      console.error('Failed to get Supabase service client');
      return NextResponse.json({ 
        success: false, 
        message: 'Database connection error',
        details: 'Could not initialize Supabase client'
      }, { status: 500 });
    }
    
    // Check if handbook already exists
    console.log(`Checking if handbook with subdomain "${subdomain}" already exists...`);
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
        details: checkError.message,
        code: checkError.code
      }, { status: 500 });
    }
    
    // If handbook already exists, return it
    if (existingHandbook) {
      console.log(`Handbook already exists with ID: ${existingHandbook.id}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Handbook already exists',
        handbook: existingHandbook,
        url: `https://${subdomain}.handbok.org`
      }, { status: 200 });
    }
    
    // Create the handbook
    console.log(`Creating new handbook "${title}" with subdomain "${subdomain}"...`);
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .insert({
        title: title,
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
        details: handbookError.message,
        code: handbookError.code
      }, { status: 500 });
    }
    
    console.log(`Handbook created with ID: ${handbook.id}`);
    
    // Create default welcome section
    console.log(`Creating welcome section for handbook ${handbook.id}...`);
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .insert({
        title: 'Welcome',
        description: 'Welcome to this handbook',
        order_index: 0,
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
      console.log(`Creating welcome page for section ${section.id}...`);
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .insert({
          title: 'Welcome',
          content: `# Welcome to ${title}\n\nThis is the start page for your handbook. You can access this handbook at https://${subdomain}.handbok.org.`,
          order_index: 0,
          section_id: section.id
        });
        
      if (pageError) {
        console.error('Error creating page:', pageError);
        // Continue anyway
      }
    }
    
    console.log(`ABC handbook creation completed successfully`);
    return NextResponse.json({ 
      success: true, 
      message: 'Handbook created successfully',
      handbook_id: handbook.id,
      subdomain,
      url: `https://${subdomain}.handbok.org`,
      next_steps: [
        "Deploy your site to Vercel with 'npx vercel --prod'",
        "Ensure your DNS has a CNAME record for *.handbok.org pointing to your Vercel deployment",
        "Visit your handbook at https://abc.handbok.org"
      ]
    }, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Unexpected error creating handbook:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      details: error.message,
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
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