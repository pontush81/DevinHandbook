#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const dns = require('dns');
const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`\n====== DIAGNOSING DATABASE CONNECTION ======`);
console.log(`Time: ${new Date().toISOString()}`);
console.log(`Node.js Version: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);

// 1. Check Environment Variables
console.log(`\n1. Checking Environment Variables:`);
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  process.exit(1);
}

// 2. Check DNS Resolution
console.log(`\n2. Checking DNS Resolution:`);
try {
  const hostname = new URL(supabaseUrl).hostname;
  console.log(`Resolving ${hostname}...`);
  
  dns.lookup(hostname, (err, address) => {
    if (err) {
      console.error(`❌ DNS resolution failed: ${err.message}`);
      runDBTest(); // Continue anyway
    } else {
      console.log(`✅ DNS resolved to ${address}`);
      runDBTest();
    }
  });
} catch (error) {
  console.error(`❌ Invalid URL: ${error.message}`);
  runDBTest(); // Continue anyway
}

// 3. Test Database Connection
function runDBTest() {
  console.log(`\n3. Testing Database Connection:`);
  
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Test connection with a simple query
  console.log(`Connecting to Supabase...`);
  
  // Test handbooks table
  testTable('handbooks');
  
  function testTable(tableName) {
    console.log(`\nTesting "${tableName}" table...`);
    
    supabase
      .from(tableName)
      .select('count')
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          console.error(`❌ Database query failed:`, error.message);
          
          // Check for typical connection issues
          if (error.message.includes('connection')) {
            console.log(`\n🔍 Likely a network connectivity issue to Supabase.`);
            console.log(`Try the following:`);
            console.log(`1. Check your internet connection`);
            console.log(`2. Verify that your firewall allows outbound connections to Supabase`);
            console.log(`3. Try connecting via the API endpoint instead of direct DB access`);
          } else if (error.message.includes('permission')) {
            console.log(`\n🔍 Likely a permissions issue.`);
            console.log(`Verify that your SUPABASE_SERVICE_ROLE_KEY is correct and has proper permissions.`);
          } else if (error.message.includes('does not exist')) {
            console.log(`\n🔍 Table "${tableName}" does not exist or schema mismatch.`);
            console.log(`Check your database schema and make sure the table exists.`);
          }
        } else {
          console.log(`✅ Successfully connected to database and queried "${tableName}" table`);
          console.log(`Data:`, data);
          
          // If successful, try to query a specific handbook
          if (tableName === 'handbooks') {
            testHandbook('abc');
          }
        }
      })
      .catch(err => {
        console.error(`❌ Unexpected error:`, err.message);
      });
  }
  
  function testHandbook(subdomain) {
    console.log(`\nLooking for handbook with subdomain "${subdomain}"...`);
    
    supabase
      .from('handbooks')
      .select('id, title, subdomain')
      .eq('subdomain', subdomain)
      .then(({ data, error }) => {
        if (error) {
          console.error(`❌ Query failed:`, error.message);
        } else if (data && data.length > 0) {
          console.log(`✅ Found handbook:`);
          console.log(`  ID: ${data[0].id}`);
          console.log(`  Title: ${data[0].title}`);
          console.log(`  Subdomain: ${data[0].subdomain}`);
        } else {
          console.log(`❌ No handbook found with subdomain "${subdomain}"`);
        }
      })
      .catch(err => {
        console.error(`❌ Unexpected error:`, err.message);
      });
  }
} 