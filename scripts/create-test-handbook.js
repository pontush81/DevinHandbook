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

async function createTestHandbook() {
  const subdomain = process.argv[2] || 'test';
  console.log(`Creating test handbook with subdomain "${subdomain}"...`);

  try {
    // Skapa eller hämta en testanvändare
    const testEmail = 'test@example.com';
    
    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    let userId;
    if (authError) {
      console.error('Could not list auth users:', authError);
      // Fallback: use a dummy UUID if auth is not accessible
      userId = '00000000-0000-0000-0000-000000000000';
    } else {
      const existingUser = authUser.users.find(u => u.email === testEmail);
      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create test user if not exists
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
          email: testEmail,
          password: 'testpassword123',
          email_confirm: true
        });
        
        if (createUserError) {
          console.error('Could not create test user:', createUserError);
          userId = '00000000-0000-0000-0000-000000000000';
        } else {
          userId = newUser.user.id;
        }
      }
    }

    console.log(`Using user ID: ${userId}`);

    // Först kontrollera om handboken redan finns
    const { data: existingHandbook, error: checkError } = await supabase
      .from('handbooks')
      .select('id')
      .eq('subdomain', subdomain);

    if (checkError) {
      console.error('Error checking existing handbook:', checkError);
      return;
    }

    if (existingHandbook && existingHandbook.length > 0) {
      console.log(`Handbook with subdomain "${subdomain}" already exists with id ${existingHandbook[0].id}`);
      return;
    }

    // Skapa en ny handbok
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .insert({
        title: `Test Handbook (${subdomain})`,
        subdomain: subdomain,
        published: true,
        owner_id: userId,
      })
      .select()
      .single();

    if (handbookError) {
      console.error('Error creating handbook:', handbookError);
      return;
    }

    console.log(`Created handbook with id ${handbook.id}`);

    // Skapa en sektion
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .insert({
        title: 'Välkommen',
        description: 'Välkommen till denna testhandbok',
        order_index: 0,
        handbook_id: handbook.id,
      })
      .select()
      .single();

    if (sectionError) {
      console.error('Error creating section:', sectionError);
      return;
    }

    console.log(`Created section with id ${section.id}`);

    // Skapa en sida
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        title: 'Startsida',
        content: `# Välkommen till ${subdomain}.handbok.org\n\nDetta är en testhandbok för att demonstrera subdomän-funktionaliteten.`,
        slug: 'startsida',
        order_index: 0,
        section_id: section.id,
      })
      .select()
      .single();

    if (pageError) {
      console.error('Error creating page:', pageError);
      return;
    }

    console.log(`Created page with id ${page.id}`);
    console.log(`\nHandbook summary:\nTitle: ${handbook.title}\nSubdomain: ${handbook.subdomain}\nID: ${handbook.id}`);
    console.log(`\nYou can access your handbook at: ${subdomain}.handbok.org or handbok.org/view?company=${subdomain}`);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTestHandbook(); 