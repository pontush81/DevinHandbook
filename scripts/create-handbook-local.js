#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Skapa readline-gränssnitt för användarinput
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Kommandoradsargument för subdomän och namn
const subdomain = process.argv[2];
const name = process.argv[3] || `Handbok för ${subdomain}`;

// Kontrollera subdomänargument
if (!subdomain) {
  console.error('❌ Du måste ange en subdomän som första argument!');
  console.log('Användning: node scripts/create-handbook-local.js <subdomain> [namn]');
  console.log('Exempel:   node scripts/create-handbook-local.js abc "Min Testhandbok"');
  process.exit(1);
}

// Validera subdomänen
const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
if (!subdomainRegex.test(subdomain)) {
  console.error('❌ Ogiltig subdomän!');
  console.log('Subdomänen får bara innehålla små bokstäver, siffror och bindestreck.');
  console.log('Den måste börja och sluta med en bokstav eller siffra.');
  process.exit(1);
}

// Hämta miljövariabler
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Miljövariabler saknas: NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY');
  console.log('Kontrollera att .env.local-filen är korrekt konfigurerad.');
  process.exit(1);
}

// Initialisera Supabase-klient med service role-nyckel (viktigt för admin-åtgärder)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createHandbook() {
  try {
    console.log(`\n🔍 Kontrollerar om subdomänen "${subdomain}" redan existerar...`);
    
    // Kontrollera om handbok med samma subdomän redan finns
    const { data: existingHandbook, error: checkError } = await supabase
      .from('handbooks')
      .select('id, title')
      .eq('subdomain', subdomain);
      
    if (checkError) {
      console.error('❌ Fel vid kontroll av befintlig handbok:', checkError.message);
      return;
    }
    
    if (existingHandbook && existingHandbook.length > 0) {
      console.log('ℹ️ En handbok med denna subdomän finns redan:');
      console.log(`   ID: ${existingHandbook[0].id}`);
      console.log(`   Namn: ${existingHandbook[0].title}`);
      console.log(`   URL: https://${subdomain}.handbok.org`);
      return;
    }
    
    console.log(`\n🔧 Skapar ny handbok "${name}" med subdomän "${subdomain}"...`);
    
    // Skapa handboken
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .insert({
        title: name,
        subdomain: subdomain,
        published: true
      })
      .select()
      .single();
      
    if (handbookError) {
      console.error('❌ Fel vid skapande av handbok:', handbookError.message);
      return;
    }
    
    console.log(`✅ Handbok skapad med ID ${handbook.id}`);
    
    // Skapa en välkomstsektion
    console.log(`\n🔧 Skapar välkomstsektion...`);
    
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .insert({
        title: 'Välkommen',
        description: 'Välkommen till denna handbok',
        order_index: 0,
        handbook_id: handbook.id,
        is_published: true
      })
      .select()
      .single();
      
    if (sectionError) {
      console.error('❌ Fel vid skapande av sektion:', sectionError.message);
      return;
    }
    
    console.log(`✅ Sektion skapad med ID ${section.id}`);
    
    // Skapa en välkomstsida
    console.log(`\n🔧 Skapar välkomstsida...`);
    
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        title: 'Startsida',
        content: `# Välkommen till ${name}\n\nDetta är startsidan för handboken. Här kan du lägga till innehåll som beskriver din handbok.`,
        slug: 'startsida',
        order_index: 0,
        section_id: section.id,
        is_published: true
      })
      .select()
      .single();
      
    if (pageError) {
      console.error('❌ Fel vid skapande av sida:', pageError.message);
      return;
    }
    
    console.log(`✅ Sida skapad med ID ${page.id}`);
    
    // Visa sammanfattning
    console.log(`\n🎉 Handbok skapad framgångsrikt!`);
    console.log(`\n📋 Sammanfattning:`);
    console.log(`   Namn: ${handbook.title}`);
    console.log(`   Subdomän: ${handbook.subdomain}`);
    console.log(`   ID: ${handbook.id}`);
    console.log(`   Skapad: ${new Date(handbook.created_at).toLocaleString()}`);
    console.log(`   URL: https://${subdomain}.handbok.org`);
    
    console.log(`\n📝 Nästa steg:`);
    console.log(`1. Deploya projektet med "npx vercel --prod" (om du inte redan gjort det)`);
    console.log(`2. Vänta några minuter för att uppdateringarna ska spridas`);
    console.log(`3. Besök din handbok på https://${subdomain}.handbok.org`);
    
  } catch (error) {
    console.error('\n❌ Oväntat fel:');
    console.error(error);
  } finally {
    rl.close();
  }
}

// Bekräftelse innan vi skapar handboken
console.log(`\n====== SKAPA HANDBOK ======`);
console.log(`Subdomän: ${subdomain}`);
console.log(`Namn: ${name}`);
console.log(`Supabase URL: ${supabaseUrl}`);

rl.question('\n⚠️ Är du säker på att du vill skapa denna handbok? (y/n) ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    createHandbook();
  } else {
    console.log('\n❌ Operation avbruten.');
    rl.close();
  }
}); 