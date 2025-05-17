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
  
  // Hämta Stripe-nyckeln
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeKey) {
    console.log('\x1b[31m%s\x1b[0m', 'Ingen STRIPE_SECRET_KEY hittades i miljökonfigurationen.');
    process.exit(1);
  }
  
  // Kontrollera vilken typ av nyckel det är
  const isTestKey = stripeKey.startsWith('sk_test_');
  const isLiveKey = stripeKey.startsWith('sk_live_');
  
  if (isTestKey) {
    console.log('\x1b[32m%s\x1b[0m', '✅ Stripe är konfigurerad i TESTLÄGE');
    console.log('\x1b[32m%s\x1b[0m', '   Alla betalningar kommer att simuleras och inga verkliga transaktioner kommer att ske.');
    console.log('\x1b[32m%s\x1b[0m', '   Du kan använda testkort som 4242 4242 4242 4242 för betalningar.');
  } else if (isLiveKey) {
    console.log('\x1b[31m%s\x1b[0m', '🔴 Stripe är konfigurerad i SKARPT LÄGE');
    console.log('\x1b[31m%s\x1b[0m', '   Varning: Verkliga betalningar kommer att utföras och ditt konto kommer att debiteras.');
    console.log('\x1b[33m%s\x1b[0m', '   För utveckling rekommenderas att byta till testläge. Se documentation/stripe-test-mode.md');
  } else {
    console.log('\x1b[33m%s\x1b[0m', '⚠️ Kunde inte avgöra om Stripe-nyckeln är för test eller skarpt läge.');
    console.log('\x1b[33m%s\x1b[0m', '   Kontrollera att STRIPE_SECRET_KEY är korrekt konfigurerad i .env.local.');
  }
  
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Ett fel inträffade vid kontroll av Stripe-läge:');
  console.error(error);
  process.exit(1);
} 