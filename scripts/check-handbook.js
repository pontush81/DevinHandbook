require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Environment variables missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkHandbook() {
  const subdomain = process.argv[2] || 'boa';
  console.log(`Checking for handbook with subdomain "${subdomain}"...`);
  console.log(`Using Supabase URL: ${supabaseUrl.substring(0, 15)}...`);

  try {
    // Query for handbook by subdomain
    const { data, error } = await supabase
      .from('handbooks')
      .select('*')
      .eq('subdomain', subdomain);

    if (error) {
      console.error('Error querying database:', error);
      return;
    }

    console.log(`Found ${data.length} handbook(s) with subdomain "${subdomain}"`);
    
    if (data.length > 0) {
      console.log('Handbook details:');
      data.forEach(handbook => {
        console.log(JSON.stringify(handbook, null, 2));
      });

      // Now check sections
      console.log('\nFetching sections for handbook...');
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('handbook_id', data[0].id);
      
      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
      } else {
        console.log(`Found ${sections.length} section(s)`);
        if (sections.length > 0) {
          console.log('Sections:');
          console.log(JSON.stringify(sections, null, 2));
        }
      }

      // Now check pages for each section
      for (const section of sections) {
        console.log(`\nFetching pages for section: ${section.title}`);
        const { data: pages, error: pagesError } = await supabase
          .from('pages')
          .select('*')
          .eq('section_id', section.id);
        if (pagesError) {
          console.error('Error fetching pages:', pagesError);
        } else {
          console.log(`Found ${pages.length} page(s)`);
          if (pages.length > 0) {
            console.log(JSON.stringify(pages, null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkHandbook(); 