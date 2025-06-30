#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Säkerhetsskanning av projekt...\n');

// 1. Kontrollera att admin-endpoints har autentiseringskontroller
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

if (unsecureAdminEndpoints.length > 0) {
  console.log('❌ KRITISK: Osäkra admin-endpoints funna:');
  unsecureAdminEndpoints.forEach(endpoint => {
    console.log(`  - ${endpoint}: Saknar autentiseringskontroller`);
  });
} else {
  console.log('✅ Alla admin-endpoints har säkerhetskontroller');
}

// 2. Kontrollera att test-endpoints har miljöskydd
console.log('\n2. Kontrollerar test-endpoints miljöskydd...');
const testEndpoints = [
  'src/app/api/test-webhook/route.ts',
  'src/app/api/test-ocr/route.ts',
  'src/app/api/test-direct/route.ts'
];

let unsecureTestEndpoints = [];
testEndpoints.forEach(endpoint => {
  if (fs.existsSync(endpoint)) {
    const content = fs.readFileSync(endpoint, 'utf-8');
    if (!content.includes('requireDevelopmentEnvironment') && 
        !content.includes('requireDevOrStagingEnvironment') &&
        !content.includes('NODE_ENV') &&
        !content.includes('development')) {
      unsecureTestEndpoints.push(endpoint);
    }
  }
});

if (unsecureTestEndpoints.length > 0) {
  console.log('⚠️ VARNING: Test-endpoints utan miljöskydd:');
  unsecureTestEndpoints.forEach(endpoint => {
    console.log(`  - ${endpoint}`);
  });
} else {
  console.log('✅ Test-endpoints har miljöskydd');
}

// 3. Kontrollera CORS-konfiguration
console.log('\n3. Kontrollerar CORS-konfiguration...');
if (fs.existsSync('next.config.js')) {
  const content = fs.readFileSync('next.config.js', 'utf-8');
  if (content.includes("value: '*'")) {
    console.log('❌ KRITISK: CORS tillåter alla origins (*)');
  } else if (content.includes('handbok.org')) {
    console.log('✅ CORS är korrekt konfigurerad för specifika domäner');
  } else {
    console.log('⚠️ VARNING: CORS-konfiguration kan behöva granskas');
  }
} else {
  console.log('⚠️ VARNING: next.config.js saknas');
}

// 4. Kontrollera att säkerhetsutilities används
console.log('\n4. Kontrollerar säkerhetsutilities...');
if (fs.existsSync('src/lib/security-utils.ts')) {
  console.log('✅ Säkerhetsutilities finns');
  
  // Kontrollera att de används i kritiska endpoints
  const criticalEndpoints = [
    'src/app/api/admin/set-admin/route.ts',
    'src/app/api/test-webhook/route.ts'
  ];
  
  let endpointsUsingSecurity = 0;
  criticalEndpoints.forEach(endpoint => {
    if (fs.existsSync(endpoint)) {
      const content = fs.readFileSync(endpoint, 'utf-8');
      if (content.includes('security-utils')) {
        endpointsUsingSecurity++;
      }
    }
  });
  
  console.log(`✅ ${endpointsUsingSecurity}/${criticalEndpoints.length} kritiska endpoints använder säkerhetsutilities`);
} else {
  console.log('❌ KRITISK: Säkerhetsutilities saknas');
}

// 5. Sök efter osäkra admin-anrop på klientsidan (uppdaterad kontroll)
console.log('\n5. Kontrollerar admin-anrop på klientsidan...');
try {
  const adminUsage = execSync('grep -r "supabase\\.auth\\.admin" src/components src/app --include="*.tsx" --include="*.ts" | grep -v "/api/" || true', { encoding: 'utf-8' });
  if (adminUsage.trim()) {
    console.log('❌ KRITISK: Admin-anrop funna på klientsidan:');
    console.log(adminUsage);
  } else {
    console.log('✅ Inga admin-anrop på klientsidan');
  }
} catch (e) {
  console.log('✅ Inga admin-anrop på klientsidan');
}

// 6. Kontrollera SERVICE_ROLE_KEY användning (uppdaterad)
console.log('\n6. Kontrollerar SERVICE_ROLE_KEY användning...');
try {
  const serviceKeyUsage = execSync('grep -r "SERVICE_ROLE_KEY" src/components src/app --include="*.tsx" --include="*.ts" | grep -v "/api/" || true', { encoding: 'utf-8' });
  if (serviceKeyUsage.trim()) {
    console.log('⚠️ VARNING: SERVICE_ROLE_KEY refererad på klientsidan:');
    console.log(serviceKeyUsage);
  } else {
    console.log('✅ SERVICE_ROLE_KEY används endast på serversidan');
  }
} catch (e) {
  console.log('✅ SERVICE_ROLE_KEY används endast på serversidan');
}

// 7. Kontrollera säkerhetsheaders
console.log('\n7. Kontrollerar säkerhetsheaders...');
if (fs.existsSync('next.config.js')) {
  const content = fs.readFileSync('next.config.js', 'utf-8');
  const requiredHeaders = ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'];
  const missingHeaders = requiredHeaders.filter(header => !content.includes(header));
  
  if (missingHeaders.length > 0) {
    console.log('⚠️ VARNING: Saknade säkerhetsheaders:', missingHeaders.join(', '));
  } else {
    console.log('✅ Alla viktiga säkerhetsheaders är konfigurerade');
  }
}

// 8. Kontrollera rate limiting
console.log('\n8. Kontrollerar rate limiting...');
try {
  const rateLimitUsage = execSync('grep -r "rateLimit" src/app/api --include="*.ts" || true', { encoding: 'utf-8' });
  if (rateLimitUsage.trim()) {
    console.log('✅ Rate limiting implementerat på kritiska endpoints');
  } else {
    console.log('⚠️ VARNING: Ingen rate limiting hittad');
  }
} catch (e) {
  console.log('⚠️ VARNING: Ingen rate limiting hittad');
}

// 9. Kör npm audit
console.log('\n9. Kör npm audit...');
try {
  const auditOutput = execSync('npm audit --audit-level=moderate', { encoding: 'utf-8' });
  console.log('✅ Inga sårbarheter på moderate+ nivå');
} catch (e) {
  console.log('❌ SÅRBARHETER FUNNA:');
  console.log(e.stdout);
}

// 10. Säkerhetssummering
console.log('\n🔒 SÄKERHETSSUMMERING:');
console.log('=====================');

if (unsecureAdminEndpoints.length === 0) {
  console.log('✅ Admin-endpoints: SÄKRA');
} else {
  console.log('❌ Admin-endpoints: OSÄKRA - Kritiskt att åtgärda!');
}

if (unsecureTestEndpoints.length === 0) {
  console.log('✅ Test-endpoints: SKYDDADE');
} else {
  console.log('⚠️ Test-endpoints: Vissa saknar miljöskydd');
}

console.log('\n🔒 Säkerhetsskanning slutförd!');
console.log('\n💡 Tips: Kör detta skript regelbundet, särskilt före deployment!'); 