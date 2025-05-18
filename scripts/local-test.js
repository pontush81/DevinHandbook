require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const { exec } = require('child_process');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Portnummer som Next.js kör på (standard: 3000)
const PORT = process.env.PORT || 3000;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Environment variables missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Testkonfiguration
const subdomainToTest = process.argv[2] || 'test';

async function checkHandbookExists() {
  console.log(`\n📊 Kontrollerar om handbok med subdomän "${subdomainToTest}" existerar...`);
  
  try {
    // Query for handbook by subdomain
    const { data, error } = await supabase
      .from('handbooks')
      .select('*')
      .eq('subdomain', subdomainToTest);

    if (error) {
      console.error('❌ Fel vid databasförfrågan:', error);
      return false;
    }

    if (data && data.length > 0) {
      console.log('✅ Handbok hittades i databasen:');
      console.log(`   ID: ${data[0].id}`);
      console.log(`   Namn: ${data[0].name}`);
      console.log(`   Subdomän: ${data[0].subdomain}`);
      console.log(`   Skapad: ${new Date(data[0].created_at).toLocaleDateString()}`);
      console.log(`   Publicerad: ${data[0].published ? 'Ja' : 'Nej'}`);
      return true;
    } else {
      console.log('❌ Ingen handbok med denna subdomän hittades i databasen.');
      return false;
    }
  } catch (error) {
    console.error('❌ Oväntat fel:', error);
    return false;
  }
}

function testLocalConnection() {
  return new Promise((resolve) => {
    console.log(`\n🌐 Testar lokal anslutning till ${subdomainToTest}.handbok.org:${PORT}...`);
    
    // Testa om Next.js-servern körs
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: '/',
      method: 'GET',
      timeout: 2000,
    }, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Next.js-servern körs på port', PORT);
        
        // Nu testa subdomänen
        console.log(`\n🔍 Testar subdomän ${subdomainToTest}.handbok.org:${PORT}...`);
        console.log(`   Använder 'curl' för att anropa subdomänen med anpassad Host-header...`);
        
        // Använd curl för att skicka anpassad Host-header
        exec(`curl -s -H "Host: ${subdomainToTest}.handbok.org" http://localhost:${PORT}`, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Fel vid anrop till subdomänen:', error);
            resolve(false);
            return;
          }
          
          if (stderr) {
            console.error('❌ Fel från curl:', stderr);
          }
          
          if (stdout.includes('Handbook Not Found')) {
            console.log('⚠️ Varning: Svar innehåller "Handbook Not Found"');
            console.log('   Detta kan bero på att handboken inte finns i databasen');
            console.log('   eller att omskrivningsreglerna inte fungerar korrekt.');
            resolve(false);
          } else if (stdout.includes('<title>')) {
            console.log('✅ Fick HTML-svar från servern');
            console.log('   Kontroll av omskrivningsregler i next.config.js ser ut att fungera!');
            resolve(true);
          } else {
            console.log('⚠️ Fick svar från servern, men kunde inte avgöra om det var korrekt.');
            console.log('   Förväntade HTML-svar innehållande <title>-tagg');
            resolve(false);
          }
        });
      } else {
        console.log(`❌ Next.js-servern svarade med status ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      console.log('❌ Kunde inte ansluta till Next.js-servern:', err.message);
      console.log('   Se till att du har startat servern med "npm run dev"');
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('❌ Timeout vid anslutning till Next.js-servern');
      console.log('   Se till att du har startat servern med "npm run dev"');
      resolve(false);
    });
    
    req.end();
  });
}

async function createTestHandbookIfNeeded() {
  const handbookExists = await checkHandbookExists();
  
  if (!handbookExists) {
    console.log(`\n📝 Handbok saknas. Vill du skapa en testhandbok med subdomänen "${subdomainToTest}"? (y/n)`);
    
    // Enkel funktion för att läsa in användarinput
    const readInput = () => {
      return new Promise((resolve) => {
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase());
        });
      });
    };
    
    process.stdout.write('> ');
    const answer = await readInput();
    
    if (answer === 'y' || answer === 'yes') {
      console.log(`\n🔧 Skapar testhandbok med subdomänen "${subdomainToTest}"...`);
      
      try {
        // Skapa ny handbok
        const { data: handbook, error: handbookError } = await supabase
          .from('handbooks')
          .insert({
            name: `Test Handbook (${subdomainToTest})`,
            subdomain: subdomainToTest,
            published: true,
          })
          .select()
          .single();

        if (handbookError) {
          console.error('❌ Fel vid skapande av handbok:', handbookError);
          return false;
        }

        console.log(`✅ Handbok skapad med ID ${handbook.id}`);

        // Skapa en sektion
        const { data: section, error: sectionError } = await supabase
          .from('sections')
          .insert({
            title: 'Välkommen',
            description: 'Välkommen till denna testhandbok',
            order: 0,
            handbook_id: handbook.id,
          })
          .select()
          .single();

        if (sectionError) {
          console.error('❌ Fel vid skapande av sektion:', sectionError);
          return true; // Fortsätt ändå, handboken är skapad
        }

        console.log(`✅ Sektion skapad med ID ${section.id}`);

        // Skapa en sida
        const { data: page, error: pageError } = await supabase
          .from('pages')
          .insert({
            title: 'Startsida',
            content: `# Välkommen till ${subdomainToTest}.handbok.org\n\nDetta är en testhandbok för att testa subdomän-funktionaliteten lokalt.`,
            order: 0,
            section_id: section.id,
          })
          .select()
          .single();

        if (pageError) {
          console.error('❌ Fel vid skapande av sida:', pageError);
          return true; // Fortsätt ändå, handboken och sektionen är skapade
        }

        console.log(`✅ Sida skapad med ID ${page.id}`);
        return true;
      } catch (error) {
        console.error('❌ Oväntat fel:', error);
        return false;
      }
    } else {
      console.log('\n❌ Ingen handbok skapades.');
      return false;
    }
  }
  
  return handbookExists;
}

async function showInstructions(handbookExists, connectionWorking) {
  console.log('\n====== RESULTAT OCH NÄSTA STEG ======\n');
  
  if (handbookExists && connectionWorking) {
    console.log('🎉 Allt ser ut att fungera korrekt!');
    console.log('\n📋 För att testa i webbläsaren:');
    console.log(`1. Se till att hosts-filen innehåller "${subdomainToTest}.handbok.org"`);
    console.log(`2. Besök http://${subdomainToTest}.handbok.org:${PORT} i din webbläsare`);
    
  } else if (!handbookExists) {
    console.log('⚠️ Du behöver skapa en handbok i databasen först.');
    console.log('\n📋 Kör följande kommando:');
    console.log(`   node scripts/create-test-handbook.js ${subdomainToTest}`);
    
  } else if (!connectionWorking) {
    console.log('⚠️ Problem med anslutningen till Next.js-servern.');
    console.log('\n📋 Kontrollera följande:');
    console.log('1. Se till att Next.js-servern körs med "npm run dev"');
    console.log('2. Kontrollera att next.config.js har korrekta rewrites-regler');
    console.log('3. Se till att hosts-filen innehåller korrekta poster');
  }
  
  console.log('\n💡 Behöver du hjälp med hosts-filen?');
  console.log('   På macOS/Linux: sudo nano /etc/hosts');
  console.log('   På Windows: Redigera C:\\Windows\\System32\\drivers\\etc\\hosts som administratör');
  console.log('\n   Lägg till följande rader:');
  console.log('   127.0.0.1       handbok.org');
  console.log(`   127.0.0.1       ${subdomainToTest}.handbok.org`);
  
  process.exit(0);
}

async function runTest() {
  console.log('\n====== LOKAL SUBDOMÄNTEST ======');
  console.log(`Testar: ${subdomainToTest}.handbok.org på port ${PORT}`);
  
  const handbookExists = await createTestHandbookIfNeeded();
  const connectionWorking = await testLocalConnection();
  
  await showInstructions(handbookExists, connectionWorking);
}

runTest(); 