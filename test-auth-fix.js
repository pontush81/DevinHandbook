#!/usr/bin/env node
/**
 * Test script för att verifiera autentiseringsfixar
 * Kör med: node test-auth-fix.js
 */

const https = require('https');
const url = require('url');

// Test endpoints
const endpoints = [
  'https://www.handbok.org/login',
  'https://handbok.org',
  'https://www.handbok.org/api/health' // Om detta endpoint finns
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AuthTest/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = https.request(endpoint, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        const authCookies = cookies.filter(cookie => 
          cookie.includes('sb-') || cookie.includes('auth')
        );
        
        resolve({
          url: endpoint,
          status: res.statusCode,
          cookies: cookies.length,
          authCookies: authCookies.length,
          authCookieDetails: authCookies,
          success: res.statusCode === 200
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        url: endpoint,
        error: err.message,
        success: false
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url: endpoint,
        error: 'Timeout',
        success: false
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testar Handbok.org autentisering...\n');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`🔍 Testar: ${endpoint}`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Status: ${result.status}`);
      console.log(`🍪 Cookies: ${result.cookies} (Auth: ${result.authCookies})`);
      if (result.authCookieDetails.length > 0) {
        console.log('🔐 Auth cookies:');
        result.authCookieDetails.forEach(cookie => {
          console.log(`   - ${cookie.split(';')[0]}`);
        });
      }
    } else {
      console.log(`❌ Fel: ${result.error || 'Okänd fel'}`);
    }
    console.log('');
  }
  
  // Sammanfattning
  console.log('📊 Sammanfattning:');
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Framgångsrika tester: ${successful}/${results.length}`);
  
  const totalAuthCookies = results.reduce((sum, r) => sum + (r.authCookies || 0), 0);
  console.log(`🍪 Totalt auth-cookies funna: ${totalAuthCookies}`);
  
  if (successful === results.length && totalAuthCookies > 0) {
    console.log('\n🎉 Alla tester lyckades och auth-cookies upptäcktes!');
  } else if (successful === results.length) {
    console.log('\n⚠️  Alla endpoints svarar men inga auth-cookies hittades.');
    console.log('   Detta är normalt för GET-requests till statiska sidor.');
  } else {
    console.log('\n❌ Vissa tester misslyckades. Kontrollera nätverksanslutning och server status.');
  }
  
  console.log('\n📝 Nästa steg:');
  console.log('1. Öppna https://www.handbok.org/login i webbläsaren');
  console.log('2. Öppna Developer Tools (F12)');
  console.log('3. Gå till Console tab');
  console.log('4. Försök logga in och leta efter "🍪 [Supabase Auth] Setting auth cookie" meddelanden');
  console.log('5. Kontrollera Application/Storage tab för sb-* cookies');
}

// Kör tester
runTests().catch(err => {
  console.error('❌ Test misslyckades:', err);
  process.exit(1);
});