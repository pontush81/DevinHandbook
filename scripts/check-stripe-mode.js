#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Sök efter .env.local filen
const envPath = path.resolve(process.cwd(), '.env.local');

try {
  // Kontrollera om .env.local filen finns
  if (!fs.existsSync(envPath)) {
    console.log('\x1b[33m%s\x1b[0m', 'Ingen .env.local fil hittades. Använder .env.local.template istället.');
    
    const templatePath = path.resolve(process.cwd(), 'env.local.template');
    if (!fs.existsSync(templatePath)) {
      console.log('\x1b[31m%s\x1b[0m', 'Varken .env.local eller env.local.template hittades. Kan inte kontrollera Stripe-läge.');
      process.exit(1);
    }
    
    // Använd mallen om ingen .env.local finns
    dotenv.config({ path: templatePath });
  } else {
    // Läs in .env.local filen
    dotenv.config({ path: envPath });
  }
  
  // Hämta Stripe-nycklarna
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST;
  
  if (!stripeKey && !stripeTestKey) {
    console.log('\x1b[31m%s\x1b[0m', 'Inga Stripe-nycklar hittades i miljökonfigurationen.');
    process.exit(1);
  }
  
  // Kontrollera vilken typ av nycklar det är
  const prodKeyIsTest = stripeKey && stripeKey.startsWith('sk_test_');
  const prodKeyIsLive = stripeKey && stripeKey.startsWith('sk_live_');
  
  const testKeyIsTest = stripeTestKey && stripeTestKey.startsWith('sk_test_');
  
  console.log('\x1b[36m%s\x1b[0m', '=== Stripe-konfiguration ===');
  
  // Kontrollera produktionsnyckel
  if (stripeKey) {
    if (prodKeyIsTest) {
      console.log('\x1b[33m%s\x1b[0m', '⚠️  STRIPE_SECRET_KEY är konfigurerad med en testnyckel!');
      console.log('\x1b[33m%s\x1b[0m', '   Detta kan vara problematiskt om denna nyckel används i produktion.');
    } else if (prodKeyIsLive) {
      console.log('\x1b[32m%s\x1b[0m', '✅ STRIPE_SECRET_KEY är konfigurerad med en produktionsnyckel.');
    } else {
      console.log('\x1b[33m%s\x1b[0m', '⚠️  STRIPE_SECRET_KEY har ett okänt format.');
    }
  } else {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  STRIPE_SECRET_KEY är inte konfigurerad.');
  }
  
  // Kontrollera testnyckel
  if (stripeTestKey) {
    if (testKeyIsTest) {
      console.log('\x1b[32m%s\x1b[0m', '✅ STRIPE_SECRET_KEY_TEST är konfigurerad med en testnyckel.');
    } else {
      console.log('\x1b[33m%s\x1b[0m', '⚠️  STRIPE_SECRET_KEY_TEST är inte en giltig testnyckel.');
    }
  } else {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  STRIPE_SECRET_KEY_TEST är inte konfigurerad.');
  }
  
  // Summering av konfigurationen
  console.log('\x1b[36m%s\x1b[0m', '\n=== Sammanfattning ===');
  
  if (prodKeyIsLive && testKeyIsTest) {
    console.log('\x1b[32m%s\x1b[0m', '✅ Konfigurationen är korrekt för både produktion och testmiljö.');
    console.log('\x1b[32m%s\x1b[0m', '   - Produktionsmiljön kommer att använda skarpa betalningar');
    console.log('\x1b[32m%s\x1b[0m', '   - Test-/utvecklingsmiljön kommer att använda testbetalningar');
  } else if (!stripeKey && testKeyIsTest) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  Endast testmiljö är konfigurerad. Ingen produktionsnyckel hittades.');
  } else if (prodKeyIsLive && !stripeTestKey) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  Endast produktionsmiljö är konfigurerad. Ingen testnyckel hittades.');
  } else {
    console.log('\x1b[31m%s\x1b[0m', '❌ Konfigurationen verkar vara felaktig eller ofullständig.');
  }
  
  console.log('\x1b[36m%s\x1b[0m', '\n=== Användning ===');
  if (testKeyIsTest) {
    console.log('\x1b[32m%s\x1b[0m', '🧪 I testläge kan du använda testkort som 4242 4242 4242 4242');
    console.log('\x1b[32m%s\x1b[0m', '   med valfritt framtida utgångsdatum, CVC och postnummer.');
  }
  
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Ett fel inträffade vid kontroll av Stripe-läge:');
  console.error(error);
  process.exit(1);
} 