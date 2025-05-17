#!/usr/bin/env node

/**
 * Skript för att testa Supabase-anslutning från kommandoraden
 * 
 * Användning:
 * node scripts/check-supabase-connection.js
 */

// Ladda miljövariabler från .env.local
require('dotenv').config({ path: '.env.local' });

const https = require('https');

function testUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200) + (data.length > 200 ? '...' : '')
        });
      });
    });
    
    req.on('error', (err) => {
      reject({
        error: err.message,
        code: err.code
      });
    });
    
    req.end();
  });
}

async function main() {
  console.log('Supabase-anslutningskontroll');
  console.log('============================');
  
  // Kontrollera miljövariabler
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('\nMiljövariabler:');
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Finns' : 'SAKNAS!'}`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Finns' : 'SAKNAS!'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'Finns' : 'SAKNAS!'}`);
  
  if (!supabaseUrl) {
    console.error('\nFel: NEXT_PUBLIC_SUPABASE_URL saknas. Lägg till den i .env.local');
    process.exit(1);
  }
  
  if (!supabaseUrl.startsWith('https://')) {
    console.error('\nFel: NEXT_PUBLIC_SUPABASE_URL måste börja med https://');
    console.log('Kör node check-supabase-config.js för att fixa detta automatiskt');
    process.exit(1);
  }
  
  console.log('\nTestar nätverksanslutning...');
  try {
    const startTime = Date.now();
    const response = await testUrl(supabaseUrl);
    const duration = Date.now() - startTime;
    
    console.log(`Status: ${response.status} (${duration}ms)`);
    console.log('Respons innehåller JSON:', response.data.includes('{'));
    
    if (response.status !== 200) {
      console.warn('\nVarning: Servern gav inte 200 OK status.');
    }
  } catch (error) {
    console.error('\nFel vid anslutning till Supabase:');
    console.error(error);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\nTips: Det verkar som att DNS-upplösning misslyckades. Kontrollera att URL:en är korrekt.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\nTips: Anslutningen nekades. Kontrollera att Supabase-tjänsten är igång.');
    }
    
    process.exit(1);
  }
  
  console.log('\nKontrollerar om projektet är korrekt konfigurerat...');
  
  console.log('\nRekommendationer:');
  console.log('1. Om alla kontroller går igenom men du fortfarande har problem, använd SupabaseProxyClient istället för direkta anrop.');
  console.log('2. Besök /supabase-test i din app för mer detaljerad diagnostik.');
  console.log('3. Kontrollera att CORS-inställningarna är korrekta i next.config.ts.');
}

main().catch(err => {
  console.error('Ett oväntat fel inträffade:', err);
  process.exit(1);
}); 