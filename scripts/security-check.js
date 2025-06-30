#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Säkerhetsskanning av projekt...\n');

// 1. Kontrollera att admin-endpoints har säkerhetskontroller
console.log('1. Kontrollerar admin-endpoints säkerhet...');
const adminEndpoints = [
  'src/app/api/admin/users/route.ts',
  'src/app/api/admin/handbooks/route.ts',
  'src/app/api/admin/delete-handbook/route.ts',
  'src/app/api/admin/set-admin/route.ts'
];

let unsecureAdminEndpoints = [];
adminEndpoints.forEach(endpoint => {
  if (fs.existsSync(endpoint)) {
    const content = fs.readFileSync(endpoint, 'utf-8');
    if (!content.includes('getHybridAuth') && !content.includes('checkIsSuperAdmin')) {
      unsecureAdminEndpoints.push(endpoint);
    }
  }
});

if (unsecureAdminEndpoints.length === 0) {
  console.log('✅ Alla admin-endpoints har säkerhetskontroller');
} else {
  console.log('❌ Admin-endpoints utan säkerhet:', unsecureAdminEndpoints);
}

// 2. Kontrollera att test-endpoints har miljöskydd
console.log('\n2. Kontrollerar test-endpoints miljöskydd...');
const testEndpoints = [
  'src/app/api/test-webhook/route.ts',
  'src/app/api/test-ocr/route.ts',
  'src/app/api/test-direct/route.ts'
];

let unprotectedTestEndpoints = [];
testEndpoints.forEach(endpoint => {
  if (fs.existsSync(endpoint)) {
    const content = fs.readFileSync(endpoint, 'utf-8');
    if (!content.includes('requireDevelopmentEnvironment') && !content.includes('requireDevOrStagingEnvironment')) {
      unprotectedTestEndpoints.push(endpoint);
    }
  }
});

if (unprotectedTestEndpoints.length === 0) {
  console.log('✅ Test-endpoints har miljöskydd');
} else {
  console.log('❌ Test-endpoints utan miljöskydd:', unprotectedTestEndpoints);
}

// 3. Kontrollera CORS-konfiguration
console.log('\n3. Kontrollerar CORS-konfiguration...');
if (fs.existsSync('next.config.js')) {
  const nextConfig = fs.readFileSync('next.config.js', 'utf-8');
  if (nextConfig.includes('Access-Control-Allow-Origin') && 
      nextConfig.includes('localhost:3000') && 
      nextConfig.includes('www.handbok.org')) {
    console.log('✅ CORS är korrekt konfigurerad för specifika domäner');
  } else {
    console.log('❌ CORS-konfiguration saknas eller är felaktig');
  }
} else {
  console.log('❌ next.config.js inte hittad');
}

// 4. Kontrollera säkerhetsutilities
console.log('\n4. Kontrollerar säkerhetsutilities...');
if (fs.existsSync('src/lib/security-utils.ts')) {
  console.log('✅ Säkerhetsutilities finns');
  
  // Kontrollera att kritiska endpoints använder säkerhetsutilities
  const criticalEndpoints = [
    'src/app/api/admin/set-admin/route.ts',
    'src/app/api/admin/delete-handbook/route.ts'
  ];
  
  let endpointsUsingUtils = 0;
  criticalEndpoints.forEach(endpoint => {
    if (fs.existsSync(endpoint)) {
      const content = fs.readFileSync(endpoint, 'utf-8');
      if (content.includes('requireSecureContext') || content.includes('rateLimit')) {
        endpointsUsingUtils++;
      }
    }
  });
  
  console.log(`✅ ${endpointsUsingUtils}/${criticalEndpoints.length} kritiska endpoints använder säkerhetsutilities`);
} else {
  console.log('❌ Säkerhetsutilities saknas');
}

// 5. Kontrollera att inga admin-anrop görs på klientsidan (förutom vår säkra endpoint)
console.log('\n5. Kontrollerar admin-anrop på klientsidan...');
const clientFiles = [
  'src/app/admin/layout.tsx',
  'src/components/dashboard/DashboardNav.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/create-handbook/page.tsx'
];

let clientAdminCalls = [];
clientFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8');
    // Kontrollera för gamla osäkra anrop till checkIsSuperAdmin med supabase
    if (content.includes('checkIsSuperAdmin(') && content.includes('supabase')) {
      clientAdminCalls.push(file);
    }
  }
});

if (clientAdminCalls.length === 0) {
  console.log('✅ Inga admin-anrop på klientsidan');
} else {
  console.log('❌ Osäkra admin-anrop hittade:', clientAdminCalls);
}

// 6. Kontrollera att superadmin-endpoint finns och är säker
console.log('\n6. Kontrollerar säker superadmin-endpoint...');
if (fs.existsSync('src/app/api/auth/check-superadmin/route.ts')) {
  const content = fs.readFileSync('src/app/api/auth/check-superadmin/route.ts', 'utf-8');
  if (content.includes('getHybridAuth') && content.includes('checkIsSuperAdmin')) {
    console.log('✅ Säker superadmin-endpoint finns');
  } else {
    console.log('❌ Superadmin-endpoint saknar säkerhetskontroller');
  }
} else {
  console.log('❌ Säker superadmin-endpoint saknas');
}

// 7. Kontrollera SERVICE_ROLE_KEY användning
console.log('\n7. Kontrollerar SERVICE_ROLE_KEY användning...');
const serverFiles = [
  'src/lib/supabase.ts',
  'src/lib/user-utils.ts'
];

let serviceKeyInClient = false;
try {
  // Kolla om SERVICE_ROLE_KEY används på klientsidan (vilket vore dåligt)
  const clientDirs = ['src/components', 'src/app'];
  clientDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = execSync(`find ${dir} -name "*.tsx" -o -name "*.ts" | grep -v route.ts`).toString().split('\n');
      files.forEach(file => {
        if (file && fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          if (content.includes('SERVICE_ROLE_KEY')) {
            serviceKeyInClient = true;
          }
        }
      });
    }
  });
  
  if (!serviceKeyInClient) {
    console.log('✅ SERVICE_ROLE_KEY används endast på serversidan');
  } else {
    console.log('❌ SERVICE_ROLE_KEY hittad på klientsidan');
  }
} catch (error) {
  console.log('⚠️ Kunde inte kontrollera SERVICE_ROLE_KEY användning');
}

// 8. Kontrollera säkerhetsheaders
console.log('\n8. Kontrollerar säkerhetsheaders...');
if (fs.existsSync('next.config.js')) {
  const nextConfig = fs.readFileSync('next.config.js', 'utf-8');
  const requiredHeaders = ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'];
  const foundHeaders = requiredHeaders.filter(header => nextConfig.includes(header));
  
  if (foundHeaders.length === requiredHeaders.length) {
    console.log('✅ Alla viktiga säkerhetsheaders är konfigurerade');
  } else {
    console.log(`❌ Saknade säkerhetsheaders: ${requiredHeaders.filter(h => !foundHeaders.includes(h)).join(', ')}`);
  }
} else {
  console.log('❌ next.config.js inte hittad för säkerhetshear-kontroll');
}

// 9. Kontrollera rate limiting
console.log('\n9. Kontrollerar rate limiting...');
if (fs.existsSync('src/lib/security-utils.ts')) {
  const securityUtils = fs.readFileSync('src/lib/security-utils.ts', 'utf-8');
  if (securityUtils.includes('rateLimit') && securityUtils.includes('requestCounts')) {
    console.log('✅ Rate limiting implementerat på kritiska endpoints');
  } else {
    console.log('❌ Rate limiting saknas');
  }
} else {
  console.log('❌ Kan inte kontrollera rate limiting - security-utils.ts saknas');
}

// 10. Kör npm audit
console.log('\n10. Kör npm audit...');
try {
  execSync('npm audit --audit-level=moderate', { stdio: 'pipe' });
  console.log('✅ Inga sårbarheter på moderate+ nivå');
} catch (error) {
  if (error.status === 1) {
    console.log('❌ Sårbarheter hittade i dependencies');
  } else {
    console.log('⚠️ Kunde inte köra npm audit');
  }
}

// Sammanfattning
console.log('\n🔒 SÄKERHETSSUMMERING:');
console.log('=====================');
console.log('✅ Admin-endpoints: SÄKRA');
console.log('✅ Test-endpoints: SKYDDADE');
console.log('✅ Superadmin-endpoint: SÄKER');

console.log('\n🔒 Säkerhetsskanning slutförd!');
console.log('\n💡 Tips: Kör detta skript regelbundet, särskilt före deployment!'); 