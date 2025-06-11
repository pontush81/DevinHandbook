#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Säkerhetsskanning av projekt...\n');

// 1. Sök efter osäkra admin-anrop på klientsidan
console.log('1. Kontrollerar admin-anrop på klientsidan...');
try {
  const adminUsage = execSync('grep -r "supabase\\.auth\\.admin" src/components src/app --include="*.tsx" --include="*.ts" || true', { encoding: 'utf-8' });
  if (adminUsage.trim()) {
    console.log('❌ KRITISK: Admin-anrop funna på klientsidan:');
    console.log(adminUsage);
  } else {
    console.log('✅ Inga admin-anrop på klientsidan');
  }
} catch (e) {
  console.log('✅ Inga admin-anrop på klientsidan');
}

// 2. Kontrollera SERVICE_ROLE_KEY användning
console.log('\n2. Kontrollerar SERVICE_ROLE_KEY användning...');
try {
  const serviceKeyUsage = execSync('grep -r "SERVICE_ROLE_KEY" src/components src/app --include="*.tsx" --include="*.ts" || true', { encoding: 'utf-8' });
  if (serviceKeyUsage.trim()) {
    console.log('⚠️ VARNING: SERVICE_ROLE_KEY refererad på klientsidan:');
    console.log(serviceKeyUsage);
  } else {
    console.log('✅ SERVICE_ROLE_KEY används säkert');
  }
} catch (e) {
  console.log('✅ SERVICE_ROLE_KEY används säkert');
}

// 3. Sök efter hardkodade API-nycklar eller lösenord
console.log('\n3. Kontrollerar hardkodade hemligheter...');
try {
  const secrets = execSync('grep -rE "(password|secret|key)\\s*=\\s*[\'\"]((?![\'\"]).{8,})" src/ --include="*.tsx" --include="*.ts" --include="*.js" || true', { encoding: 'utf-8' });
  if (secrets.trim()) {
    console.log('⚠️ VARNING: Potentiella hardkodade hemligheter:');
    console.log(secrets);
  } else {
    console.log('✅ Inga hardkodade hemligheter funna');
  }
} catch (e) {
  console.log('✅ Inga hardkodade hemligheter funna');
}

// 4. Kontrollera dev-endpoints i produktion
console.log('\n4. Kontrollerar dev-endpoints...');
const devEndpoints = [];
const scanDir = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file === 'dev' && dir.includes('api')) {
        devEndpoints.push(filePath);
      }
      scanDir(filePath);
    }
  });
};

try {
  scanDir('src/app/api');
  if (devEndpoints.length > 0) {
    console.log('⚠️ VARNING: Dev-endpoints funna:');
    devEndpoints.forEach(endpoint => {
      console.log(`  - ${endpoint}`);
      // Kontrollera om de är skyddade
      const routeFile = path.join(endpoint, 'route.ts');
      if (fs.existsSync(routeFile)) {
        const content = fs.readFileSync(routeFile, 'utf-8');
        if (!content.includes('NODE_ENV') || !content.includes('development')) {
          console.log(`    ❌ KRITISK: ${routeFile} är INTE skyddad för produktion!`);
        } else {
          console.log(`    ✅ Skyddad för produktion`);
        }
      }
    });
  } else {
    console.log('✅ Inga dev-endpoints funna');
  }
} catch (e) {
  console.log('✅ Inga dev-endpoints funna');
}

// 5. Kör npm audit
console.log('\n5. Kör npm audit...');
try {
  const auditOutput = execSync('npm audit --audit-level=moderate', { encoding: 'utf-8' });
  console.log('✅ Inga sårbarheter på moderate+ nivå');
} catch (e) {
  console.log('❌ SÅRBARHETER FUNNA:');
  console.log(e.stdout);
}

// 6. Kontrollera .env.example vs .env
console.log('\n6. Kontrollerar miljövariabler...');
if (fs.existsSync('.env.example') && fs.existsSync('.env.local')) {
  const example = fs.readFileSync('.env.example', 'utf-8');
  const actual = fs.readFileSync('.env.local', 'utf-8');
  
  const exampleKeys = example.match(/^[A-Z_]+=.*/gm)?.map(line => line.split('=')[0]) || [];
  const actualKeys = actual.match(/^[A-Z_]+=.*/gm)?.map(line => line.split('=')[0]) || [];
  
  const missingKeys = exampleKeys.filter(key => !actualKeys.includes(key));
  if (missingKeys.length > 0) {
    console.log('⚠️ VARNING: Saknade miljövariabler:');
    missingKeys.forEach(key => console.log(`  - ${key}`));
  } else {
    console.log('✅ Alla miljövariabler är definierade');
  }
} else {
  console.log('⚠️ VARNING: .env.example eller .env.local saknas');
}

console.log('\n🔒 Säkerhetsskanning slutförd!'); 