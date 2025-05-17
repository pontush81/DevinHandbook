#!/usr/bin/env node

/**
 * Detta skript hittar och åtgärdar duplicerade route-filer i Next.js-applikationen.
 * Det letar efter fall där både route.ts och route.tsx existerar i samma katalog
 * och tar bort .tsx-versionen.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Konfigurera sökvägen till app-katalogen
const APP_DIR = path.join(process.cwd(), 'src', 'app');
const NEXT_CACHE = path.join(process.cwd(), '.next');

console.log('🔍 Söker efter duplicerade route-filer...');

// Funktion för att hitta alla katalogerna rekursivt
function findDirectories(dir, results = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      results.push(fullPath);
      findDirectories(fullPath, results);
    }
  }
  
  return results;
}

// Huvudfunktion för att hitta och åtgärda duplicerade routes
function fixDuplicateRoutes() {
  // Hämta alla kataloger i app-strukturen
  const directories = findDirectories(APP_DIR);
  let fixedCount = 0;
  
  directories.forEach(dir => {
    const tsRoute = path.join(dir, 'route.ts');
    const tsxRoute = path.join(dir, 'route.tsx');
    
    // Kontrollera om båda filerna existerar
    if (fs.existsSync(tsRoute) && fs.existsSync(tsxRoute)) {
      console.log(`⚠️ Duplicerad route hittad i: ${dir}`);
      
      // Ta bort .tsx-versionen
      try {
        fs.unlinkSync(tsxRoute);
        console.log(`✅ Borttagen: ${tsxRoute}`);
        fixedCount++;
      } catch (err) {
        console.error(`❌ Kunde inte ta bort ${tsxRoute}: ${err.message}`);
      }
    }
  });
  
  // Sök även efter temporära eller dolda filer
  const hiddenRouteFiles = execSync(`find ${APP_DIR} -name "*.route.tsx*" -o -name "*.route.ts.*" -o -name "*.#route.ts*" -o -name "*.#route.tsx*"`, { encoding: 'utf8' }).trim();
  
  if (hiddenRouteFiles) {
    const files = hiddenRouteFiles.split('\n');
    files.forEach(file => {
      if (file) {
        try {
          fs.unlinkSync(file);
          console.log(`✅ Borttagen dold fil: ${file}`);
          fixedCount++;
        } catch (err) {
          console.error(`❌ Kunde inte ta bort ${file}: ${err.message}`);
        }
      }
    });
  }
  
  // Rensa Next.js-cachen om vi hittade problem
  if (fixedCount > 0 || process.argv.includes('--force-clean')) {
    console.log('🧹 Rensar Next.js cache...');
    try {
      if (fs.existsSync(NEXT_CACHE)) {
        fs.rmSync(NEXT_CACHE, { recursive: true, force: true });
        console.log('✅ Next.js cache rensad!');
      }
    } catch (err) {
      console.error(`❌ Kunde inte rensa Next.js cache: ${err.message}`);
    }
  }
  
  return fixedCount;
}

// Kör fix-funktionen
const fixedCount = fixDuplicateRoutes();

if (fixedCount > 0) {
  console.log(`🎉 Fixade ${fixedCount} duplicerade route-filer!`);
  console.log('🚀 Du kan nu starta om utvecklingsservern med "npm run dev"');
} else {
  console.log('✅ Inga duplicerade route-filer hittades!');
  
  // Kontrollera extra för Next.js cache-problem
  if (process.argv.includes('--force-clean')) {
    console.log('🔄 Next.js-cache har rensats enligt begäran.');
  }
} 