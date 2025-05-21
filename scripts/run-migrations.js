/**
 * Script för att köra SQL-migrationer mot Supabase
 * 
 * Använd: node scripts/run-migrations.js <filename>
 * Exempel: node scripts/run-migrations.js update_user_id_to_owner_id.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Supabase-konfiguration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Saknar Supabase-konfiguration. Kolla .env-filen');
  process.exit(1);
}

// Skapa Supabase-klient med service-role för admin-åtkomst
const supabase = createClient(
  supabaseUrl,
  supabaseServiceRole, 
  { 
    auth: { persistSession: false } 
  }
);

async function runMigration(filename) {
  try {
    // Läs migrations-filen
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Kör migration: ${filename}`);
    console.log('--------------------');
    console.log(sql);
    console.log('--------------------');
    
    // Kör SQL direkt mot databasen
    const { error } = await supabase.rpc('pgadmin_exec_sql', { sql });
    
    if (error) {
      console.error('Migrations-fel:', error);
      process.exit(1);
    }
    
    console.log(`Migration slutförd: ${filename}`);
  } catch (error) {
    console.error('Fel vid körning av migration:', error);
    process.exit(1);
  }
}

// Hämta filnamn från CLI-argument
const filename = process.argv[2];
if (!filename) {
  console.error('Inget filnamn angivet. Använd: node scripts/run-migrations.js <filename>');
  process.exit(1);
}

// Kör migrationen
runMigration(filename); 