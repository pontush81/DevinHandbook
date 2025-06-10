require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugCurrentState() {
  try {
    console.log('🔍 Debugging current state...\n');
    
    // Check what handbook you're currently viewing
    console.log('1. Available handbooks:');
    const { data: handbooks } = await supabase
      .from('handbooks')
      .select('id, title, slug, published')
      .order('created_at', { ascending: false });
    
    handbooks?.forEach(handbook => {
      console.log(`   📚 ${handbook.title} (${handbook.slug}) - Published: ${handbook.published}`);
    });
    
    console.log('\n2. All "Ekonomi" sections across all handbooks:');
    const { data: ekonomiSections } = await supabase
      .from('sections')
      .select(`
        id, 
        title, 
        is_public, 
        is_published, 
        handbook_id,
        handbooks!inner(title, slug)
      `)
      .ilike('title', '%Ekonomi%');
    
    ekonomiSections?.forEach(section => {
      const status = [];
      if (section.is_public === false) status.push('🔒 PRIVATE');
      if (section.is_published === false) status.push('📝 UNPUBLISHED'); 
      if (status.length === 0) status.push('✅ VISIBLE');
      
      console.log(`   📁 ${section.title} in "${section.handbooks.title}" (${section.handbooks.slug})`);
      console.log(`      ID: ${section.id}`);
      console.log(`      Status: ${status.join(', ')}`);
      console.log(`      is_public: ${section.is_public}`);
      console.log(`      is_published: ${section.is_published}`);
      console.log('');
    });
    
    // Check which handbook is currently being viewed
    console.log('3. Testing getHandbookBySlug for BRF Segerstaden:');
    const { data: testHandbook, error } = await supabase
      .from('handbooks')
      .select(`
        id,
        title,
        slug,
        published,
        sections (
          id,
          title,
          is_public,
          is_published
        )
      `)
      .eq('slug', 'brf-segerstaden')
      .eq('published', true)
      .single();
    
    if (error) {
      console.log('   ❌ Error:', error.message);
    } else if (testHandbook) {
      console.log(`   ✅ Found: ${testHandbook.title}`);
      console.log(`   Sections:`);
      testHandbook.sections?.forEach(section => {
        const shouldShow = section.is_public !== false && section.is_published !== false;
        console.log(`     📁 ${section.title}: is_public=${section.is_public}, is_published=${section.is_published} -> VISIBLE: ${shouldShow}`);
      });
    } else {
      console.log('   ⚠️  No published handbook found with slug "brf-segerstaden"');
      
      console.log('\n   Checking unpublished:');
      const { data: unpublishedHandbook } = await supabase
        .from('handbooks')
        .select('id, title, slug, published')
        .eq('slug', 'brf-segerstaden')
        .single();
        
      if (unpublishedHandbook) {
        console.log(`   📚 Found unpublished: ${unpublishedHandbook.title} (published: ${unpublishedHandbook.published})`);
      }
    }
    
  } catch (e) {
    console.error('💥 Unexpected error:', e);
  }
}

debugCurrentState(); 