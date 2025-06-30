#!/usr/bin/env node

/**
 * Test för att verifiera att säkerhetsförbättringar inte har brutit befintlig funktionalitet
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Konfiguration
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.handbok.org' 
  : 'http://localhost:3000';

console.log('🧪 SÄKERHETSFUNKTIONALITETSTEST');
console.log('===============================');
console.log(`Testing mot: ${BASE_URL}`);
console.log(`Miljö: ${process.env.NODE_ENV || 'development'}\n`);

// Test utilities
async function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
        ...options.headers
      },
      timeout: 10000
    };

    const req = lib.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test cases
const tests = [
  {
    name: 'CORS Headers - API Endpoints',
    test: async () => {
      const response = await makeRequest('/api/admin/users', {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'GET',
          'Origin': BASE_URL
        }
      });
      
      const corsHeaders = response.headers['access-control-allow-origin'];
      return {
        pass: !!corsHeaders,
        details: `CORS Origin: ${corsHeaders || 'MISSING'}`
      };
    }
  },
  
  {
    name: 'Admin Endpoints - Autentiseringsskydd',
    test: async () => {
      const endpoints = [
        { path: '/api/admin/users', method: 'GET' },
        { path: '/api/admin/handbooks', method: 'GET' },
        { path: '/api/admin/set-admin', method: 'POST', body: { userId: 'test', isAdmin: true } }
      ];
      
      const results = [];
      for (const endpoint of endpoints) {
        try {
          const response = await makeRequest(endpoint.path, {
            method: endpoint.method,
            body: endpoint.body
          });
          results.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            status: response.status,
            protected: response.status === 401 || (response.data && response.data.message === "Ej autentiserad")
          });
        } catch (error) {
          results.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            status: 'ERROR',
            protected: false,
            error: error.message
          });
        }
      }
      
      const allProtected = results.every(r => r.protected);
      return {
        pass: allProtected,
        details: `Protected endpoints: ${results.filter(r => r.protected).length}/${results.length}`,
        results
      };
    }
  },
  
  {
    name: 'Test Endpoints - Miljöskydd (Dev Only)',
    test: async () => {
      if (process.env.NODE_ENV === 'production') {
        // I produktion ska test-endpoints vara blockerade
        const testEndpoints = [
          '/api/test-webhook',
          '/api/test-ocr',
          '/api/test-direct'
        ];
        
        const results = [];
        for (const endpoint of testEndpoints) {
          try {
            const response = await makeRequest(endpoint, { method: 'POST', body: {} });
            results.push({
              endpoint,
              status: response.status,
              blocked: response.status === 403
            });
          } catch (error) {
            results.push({
              endpoint,
              status: 'ERROR',
              blocked: true,
              error: error.message
            });
          }
        }
        
        const allBlocked = results.every(r => r.blocked);
        return {
          pass: allBlocked,
          details: `Blocked test endpoints: ${results.filter(r => r.blocked).length}/${results.length}`,
          results
        };
      } else {
        // I development ska test-endpoints fungera
        try {
          const response = await makeRequest('/api/test-ocr');
          return {
            pass: response.status !== 403,
            details: `Test endpoint accessible in dev: ${response.status !== 403}`
          };
        } catch (error) {
          return {
            pass: false,
            details: `Test endpoint error: ${error.message}`
          };
        }
      }
    }
  },
  
  {
    name: 'Rate Limiting - Funktionalitet',
    test: async () => {
      // Testa att vi kan göra åtminstone en förfrågan utan att bli blockerade
      try {
        const response = await makeRequest('/api/admin/users');
        return {
          pass: response.status !== 429,
          details: `Rate limit status: ${response.status === 429 ? 'TRIGGERED' : 'OK'}`
        };
      } catch (error) {
        return {
          pass: false,
          details: `Rate limit test error: ${error.message}`
        };
      }
    }
  },
  
  {
    name: 'Säkerhetsheaders - Implementation',
    test: async () => {
      const response = await makeRequest('/');
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options', 
        'referrer-policy'
      ];
      
      const presentHeaders = securityHeaders.filter(header => 
        response.headers[header] || response.headers[header.toLowerCase()]
      );
      
      return {
        pass: presentHeaders.length >= 2, // Minst 2 av 3 headers
        details: `Security headers: ${presentHeaders.length}/${securityHeaders.length} (${presentHeaders.join(', ')})`
      };
    }
  },
  
  {
    name: 'Public Endpoints - Fortfarande Tillgängliga',
    test: async () => {
      const publicEndpoints = [
        '/',
        '/api/health-check'
      ];
      
      const results = [];
      for (const endpoint of publicEndpoints) {
        try {
          const response = await makeRequest(endpoint);
          results.push({
            endpoint,
            status: response.status,
            accessible: response.status < 400
          });
        } catch (error) {
          results.push({
            endpoint,
            status: 'ERROR',
            accessible: false,
            error: error.message
          });
        }
      }
      
      const allAccessible = results.every(r => r.accessible);
      return {
        pass: allAccessible,
        details: `Accessible public endpoints: ${results.filter(r => r.accessible).length}/${results.length}`,
        results
      };
    }
  }
];

// Kör tester
async function runTests() {
  console.log('Kör säkerhetsfunktionalitetstester...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of tests) {
    try {
      console.log(`🧪 ${testCase.name}...`);
      const result = await testCase.test();
      
      if (result.pass) {
        console.log(`✅ PASS: ${result.details}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${result.details}`);
        if (result.results) {
          result.results.forEach(r => {
            console.log(`   - ${r.endpoint}: ${r.status} ${r.error ? `(${r.error})` : ''}`);
          });
        }
        failed++;
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ERROR: ${testCase.name} - ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('===================');
  console.log('TESTRESULTAT:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 Alla tester godkända! Säkerhetsförbättringar har inte brutit funktionalitet.');
  } else {
    console.log('\n⚠️ Vissa tester misslyckades. Granska resultaten ovan.');
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Kör om vi anropas direkt
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, makeRequest }; 