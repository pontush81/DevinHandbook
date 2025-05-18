#!/usr/bin/env node
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const readline = require('readline');

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
  console.log('Användning: node scripts/create-handbook-prod.js <subdomain> [namn]');
  console.log('Exempel:   node scripts/create-handbook-prod.js abc "Min Testhandbok"');
  process.exit(1);
}

// API-nyckel för autentisering
const apiKey = process.env.ADMIN_API_KEY || 'handbok-secret-key';

// Base URL - justera om ditt projekt är deployat på en annan domän
const baseUrl = process.env.API_BASE_URL || 'https://handbok.org';

async function createHandbook() {
  try {
    console.log(`\n🔧 Skapar handbok med subdomän "${subdomain}" och namn "${name}"...`);
    
    // API-anrop för att skapa handbok
    const response = await fetch(`${baseUrl}/api/create-handbook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ subdomain, name })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      if (data.success) {
        console.log('\n✅ Handbok skapad framgångsrikt!');
        console.log(`   ID: ${data.handbook_id}`);
        console.log(`   Subdomän: ${data.subdomain}`);
        console.log(`   URL: ${data.url}`);
        
        console.log('\n📝 Nästa steg:');
        console.log('1. Vänta ett par minuter för att DNS-ändringarna ska spridas');
        console.log(`2. Besök handboken på: ${data.url}`);
        console.log('3. Om handboken inte är tillgänglig, kontrollera DNS- och Vercel-konfigurationen');
      } else {
        console.log('\n⚠️ Handboken finns redan eller kunde inte skapas');
        console.log(`   Meddelande: ${data.message}`);
        if (data.handbook_id) {
          console.log(`   Befintligt ID: ${data.handbook_id}`);
          console.log(`   URL: https://${data.subdomain}.handbok.org`);
        }
      }
    } else {
      console.error('\n❌ Fel vid skapande av handbok:');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Felmeddelande: ${data.message}`);
      if (data.details) {
        console.error(`   Detaljer: ${data.details}`);
      }
    }
  } catch (error) {
    console.error('\n❌ Oväntat fel:');
    console.error(error);
  } finally {
    rl.close();
  }
}

// Bekräftelse innan vi skapar handboken
console.log(`\n====== SKAPA HANDBOK I PRODUKTION ======`);
console.log(`Subdomän: ${subdomain}`);
console.log(`Namn: ${name}`);
console.log(`API URL: ${baseUrl}/api/create-handbook`);

rl.question('\n⚠️ Är du säker på att du vill skapa denna handbok i produktionsmiljön? (y/n) ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    createHandbook();
  } else {
    console.log('\n❌ Operation avbruten.');
    rl.close();
  }
}); 