#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Sökväg till .env.local
const envPath = path.join(process.cwd(), '.env.local');

console.log('Fixar Supabase URL i .env.local...');

// Kontrollera om filen finns
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local hittades inte. Skapa filen först.');
  process.exit(1);
}

// Läs filen
const envContent = fs.readFileSync(envPath, 'utf8');

// Ersätt felaktig URL med korrekt URL (ta bort db.-prefixet)
const correctedContent = envContent.replace(
  /NEXT_PUBLIC_SUPABASE_URL=https:\/\/db\.kjsquvjzctdwgjypcjrg\.supabase\.co/g,
  'NEXT_PUBLIC_SUPABASE_URL=https://kjsquvjzctdwgjypcjrg.supabase.co'
);

// Spara tillbaka till filen
fs.writeFileSync(envPath, correctedContent);

// Kontrollera om något ändrades
if (envContent !== correctedContent) {
  console.log('✅ Supabase URL har korrigerats! Prefixet "db." har tagits bort.');
} else {
  console.log('ℹ️ Ingen ändring behövdes, URL:en var redan korrekt.');
}

console.log('\nNy konfiguration:');
console.log('NEXT_PUBLIC_SUPABASE_URL=https://kjsquvjzctdwgjypcjrg.supabase.co'); 