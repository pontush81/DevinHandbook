#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Constants for the ABC handbook
const subdomain = 'abc';
const title = 'ABC Handbook';

console.log(`\n====== CREATING ABC HANDBOOK ======`);
console.log(`Subdomain: ${subdomain}`);
console.log(`Title: ${title}`);

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Environment variables missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.log('Make sure your .env.local file is properly configured.');
  process.exit(1);
}

console.log(`Supabase URL: ${supabaseUrl}`);

// Initialize Supabase client with service role key (important for admin actions)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAbcHandbook() {
  try {
    console.log(`\n🔍 Checking if subdomain "${subdomain}" already exists...`);
    
    // Check if a handbook with this subdomain already exists
    const { data: existingHandbook, error: checkError } = await supabase
      .from('handbooks')
      .select('id, title')
      .eq('subdomain', subdomain)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking for existing handbook:', checkError.message);
      return;
    }
    
    if (existingHandbook) {
      console.log('ℹ️ A handbook with this subdomain already exists:');
      console.log(`   ID: ${existingHandbook.id}`);
      console.log(`   Title: ${existingHandbook.title}`);
      console.log(`   URL: https://${subdomain}.handbok.org`);
      return;
    }
    
    console.log(`\n🔧 Creating new handbook "${title}" with subdomain "${subdomain}"...`);
    
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
      console.error('❌ Error creating handbook:', handbookError.message);
      return;
    }
    
    console.log(`✅ Handbook created with ID ${handbook.id}`);
    
    // Create a welcome section
    console.log(`\n🔧 Creating welcome section...`);
    
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
      console.error('❌ Error creating section:', sectionError.message);
      return;
    }
    
    console.log(`✅ Section created with ID ${section.id}`);
    
    // Create a welcome page
    console.log(`\n🔧 Creating welcome page...`);
    
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        title: 'Welcome',
        content: `# Welcome to ${title}\n\nThis is the start page for your handbook. You can access this handbook at https://${subdomain}.handbok.org.`,
        order_index: 0,
        section_id: section.id,
        slug: 'welcome'
      })
      .select()
      .single();
      
    if (pageError) {
      console.error('❌ Error creating page:', pageError.message);
      return;
    }
    
    console.log(`✅ Page created with ID ${page.id}`);
    
    // Show summary
    console.log(`\n🎉 ABC Handbook created successfully!`);
    console.log(`\n📋 Summary:`);
    console.log(`   Title: ${handbook.title}`);
    console.log(`   Subdomain: ${handbook.subdomain}`);
    console.log(`   ID: ${handbook.id}`);
    console.log(`   Created: ${new Date(handbook.created_at).toLocaleString()}`);
    console.log(`   URL: https://${subdomain}.handbok.org`);
    
    console.log(`\n📝 Next steps:`);
    console.log(`1. Deploy the project with "npx vercel --prod" (if you haven't already)`);
    console.log(`2. Wait a few minutes for the updates to propagate`);
    console.log(`3. Visit your handbook at https://${subdomain}.handbok.org`);
    
  } catch (error) {
    console.error('\n❌ Unexpected error:');
    console.error(error);
  }
}

// Run the function immediately
createAbcHandbook(); 