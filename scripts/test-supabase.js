#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { exec } = require('child_process');

// Hämta miljövariabler
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Miljövariabler saknas! Kontrollera din .env.local-fil');
  process.exit(1);
}

console.log('🔍 Testar anslutning till Supabase med curl...\n');

// Skapa curl-kommando för att lista handböcker
const curlCommand = `curl -s "${supabaseUrl}/rest/v1/handbooks?select=id,name,subdomain&limit=5" \\
  -H "apikey: ${supabaseAnonKey}" \\
  -H "Authorization: Bearer ${supabaseAnonKey}"`;

// Skapa curl-kommando för att skapa en handbok
const subdomain = "test" + Math.floor(Math.random() * 1000);
const createCommand = `curl -s -X POST "${supabaseUrl}/rest/v1/handbooks" \\
  -H "apikey: ${supabaseServiceKey}" \\
  -H "Authorization: Bearer ${supabaseServiceKey}" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{"name":"Test via curl","subdomain":"${subdomain}","published":true}'`;

// Testa att lista handböcker
exec(curlCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Fel vid anslutning till Supabase:');
    console.error(error);
    return;
  }
  
  if (stderr) {
    console.error('❌ Stderr:');
    console.error(stderr);
    return;
  }
  
  try {
    const data = JSON.parse(stdout);
    console.log('✅ Supabase-anslutning lyckades!');
    console.log('\n📋 Första 5 handböckerna:');
    
    if (data.length === 0) {
      console.log('   Inga handböcker hittades.');
    } else {
      data.forEach(handbook => {
        console.log(`   ID: ${handbook.id}, Namn: ${handbook.name}, Subdomän: ${handbook.subdomain}`);
      });
    }
    
    console.log('\n🔍 Testar att skapa en handbok med cURL...');
    
    // Testa att skapa en handbok
    exec(createCommand, (createError, createStdout, createStderr) => {
      if (createError) {
        console.error('❌ Fel vid skapande av handbok:');
        console.error(createError);
        return;
      }
      
      if (createStderr) {
        console.error('❌ Stderr:');
        console.error(createStderr);
        return;
      }
      
      try {
        const createData = JSON.parse(createStdout);
        console.log('✅ Handbok skapad framgångsrikt!');
        console.log(`   ID: ${createData[0].id}`);
        console.log(`   Namn: ${createData[0].name}`);
        console.log(`   Subdomän: ${createData[0].subdomain}`);
        
        console.log('\n📝 För att skapa en handbok med subdomänen "abc", kör:');
        console.log(`curl -s -X POST "${supabaseUrl}/rest/v1/handbooks" \\`);
        console.log(`  -H "apikey: ${supabaseServiceKey.substring(0, 10)}..." \\`);
        console.log(`  -H "Authorization: Bearer ${supabaseServiceKey.substring(0, 10)}..." \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -H "Prefer: return=representation" \\`);
        console.log(`  -d '{"name":"ABC Testhandbok","subdomain":"abc","published":true}'`);
      } catch (parseError) {
        console.error('❌ Kunde inte tolka svar från Supabase:');
        console.log('Rådata:', createStdout);
      }
    });
    
  } catch (parseError) {
    console.error('❌ Kunde inte tolka svar från Supabase:');
    console.log('Rådata:', stdout);
  }
}); 