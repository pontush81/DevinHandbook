#!/usr/bin/env node

/**
 * Specifik CORS-test för att identifiera potentiella CORS-problem
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.handbok.org' 
  : 'http://localhost:3000';

console.log('🌐 CORS KOMPATIBILITETSTEST');
console.log('==========================');
console.log(`Testing mot: ${BASE_URL}\n`);

async function testCORS(endpoint, origin, method = 'GET') {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    // Preflight request
    const preflightOptions = {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': method,
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    };

    const req = lib.request(url, preflightOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const allowOrigin = res.headers['access-control-allow-origin'];
        const allowMethods = res.headers['access-control-allow-methods'];
        const allowHeaders = res.headers['access-control-allow-headers'];
        const allowCredentials = res.headers['access-control-allow-credentials'];
        
        resolve({
          status: res.statusCode,
          allowOrigin,
          allowMethods,
          allowHeaders,
          allowCredentials,
          originAllowed: allowOrigin === origin || allowOrigin === '*',
          methodAllowed: allowMethods && allowMethods.includes(method),
          headersAllowed: allowHeaders && allowHeaders.includes('Authorization')
        });
      });
    });

    req.on('error', () => resolve({ error: true }));
    req.end();
  });
}

const corsTests = [
  {
    name: 'Localhost Origin (Development)',
    origin: 'http://localhost:3000',
    endpoints: ['/api/admin/users', '/api/handbook/create', '/api/auth/confirm-user']
  },
  {
    name: 'Production Domain',
    origin: 'https://www.handbok.org',
    endpoints: ['/api/admin/users', '/api/handbook/create', '/api/auth/confirm-user']
  },
  {
    name: 'Staging Domain', 
    origin: 'https://staging.handbok.org',
    endpoints: ['/api/admin/users', '/api/handbook/create']
  },
  {
    name: 'Obehörig Origin (Ska blockeras)',
    origin: 'https://evil-site.com',
    endpoints: ['/api/admin/users']
  }
];

async function runCORSTests() {
  let totalTests = 0;
  let passedTests = 0;
  
  for (const testGroup of corsTests) {
    console.log(`\n📍 Testing ${testGroup.name}:`);
    console.log(`Origin: ${testGroup.origin}`);
    
    for (const endpoint of testGroup.endpoints) {
      totalTests++;
      console.log(`\n  🧪 ${endpoint}...`);
      
      const result = await testCORS(endpoint, testGroup.origin, 'GET');
      
      if (result.error) {
        console.log(`  ❌ ERROR: Request failed`);
        continue;
      }
      
      const isProduction = process.env.NODE_ENV === 'production';
      const isEvilOrigin = testGroup.origin.includes('evil-site.com');
      
      // För evil origins ska requests blockeras
      if (isEvilOrigin) {
        if (!result.originAllowed) {
          console.log(`  ✅ PASS: Evil origin correctly blocked`);
          passedTests++;
        } else {
          console.log(`  ❌ FAIL: Evil origin not blocked! (${result.allowOrigin})`);
        }
      } else {
        // För legitima origins ska CORS fungera
        if (result.originAllowed) {
          console.log(`  ✅ PASS: Origin allowed (${result.allowOrigin})`);
          passedTests++;
        } else {
          console.log(`  ❌ FAIL: Origin not allowed (${result.allowOrigin})`);
        }
      }
      
      // Detaljerad information
      console.log(`     Status: ${result.status}`);
      console.log(`     Methods: ${result.allowMethods || 'NONE'}`);
      console.log(`     Headers: ${result.allowHeaders || 'NONE'}`);
      console.log(`     Credentials: ${result.allowCredentials || 'false'}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('CORS TESTRESULTAT:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`📊 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 Alla CORS-tester godkända! Inga CORS-problem identifierade.');
  } else {
    console.log('\n⚠️ CORS-problem identifierade. Granska resultaten ovan.');
  }
  
  // Rekommendationer
  console.log('\n💡 CORS REKOMMENDATIONER:');
  if (process.env.NODE_ENV === 'development') {
    console.log('- Development: CORS bör tillåta localhost');
    console.log('- Säkerställ att credentials är tillåtna för auth-endpoints');
  } else {
    console.log('- Production: CORS bör endast tillåta dina domäner');
    console.log('- Blockera alla obehöriga origins');
  }
  
  return passedTests === totalTests;
}

if (require.main === module) {
  runCORSTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal CORS test error:', error);
    process.exit(1);
  });
} 