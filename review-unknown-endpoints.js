/**
 * GRANSKNING AV OKÄNDA ENDPOINTS
 * Fokuserar på de 22 endpoints som behöver manuell säkerhetsgranskning
 */

const fs = require('fs');
const path = require('path');

// Lista på endpoints som behöver granskning (från vår audit)
const endpointsToReview = [
  '/admin/add-member',
  '/admin/backup/create', 
  '/admin/backup/restore',
  '/admin/backup/scheduled',
  '/admin/backup/schedules/[id]',
  '/admin/backup/schedules',
  '/admin/backup/stats',
  '/admin/cancel-subscription',
  '/admin/delete-user',
  '/admin/revalidate-handbook', 
  '/admin/suspend-account',
  '/admin/toggle-handbook-published',
  '/auth/send-confirmation-email',
  '/check-status',
  '/gdpr/download/[token]',
  '/gdpr/export-request',
  '/manifest',
  '/supabase-diagnosis',
  '/supabase-proxy',
  '/trial/check-status',
  '/trial/start'
];

function analyzeEndpointSecurity(apiPath) {
  // Konvertera API path till filsökväg
  let filePath = path.join(process.cwd(), 'src/app/api', apiPath, 'route.ts');
  filePath = filePath.replace(/\[/g, '%5B').replace(/\]/g, '%5D');
  
  if (!fs.existsSync(filePath)) {
    return {
      path: apiPath,
      status: 'FILE_NOT_FOUND',
      security: 'UNKNOWN',
      issues: ['Fil hittades inte'],
      recommendations: []
    };
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const analysis = {
    path: apiPath,
    status: 'ANALYZED',
    security: 'UNKNOWN',
    authMethod: 'NONE',
    issues: [],
    recommendations: [],
    details: {
      methods: [],
      imports: [],
      hasAuth: false,
      publicSafe: false
    }
  };
  
  // Hitta HTTP-metoder
  const methodPattern = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)/g;
  let match;
  while ((match = methodPattern.exec(content)) !== null) {
    analysis.details.methods.push(match[1]);
  }
  
  // Analysera imports för säkerhetsfunktioner
  if (content.includes('adminAuth')) {
    analysis.details.imports.push('adminAuth');
  }
  if (content.includes('getHybridAuth')) {
    analysis.details.imports.push('getHybridAuth');
  }
  if (content.includes('checkIsSuperAdmin')) {
    analysis.details.imports.push('checkIsSuperAdmin');
  }
  if (content.includes('createSupabaseServerClient')) {
    analysis.details.imports.push('createSupabaseServerClient');
  }
  
  // SÄKERHETSANALYS
  
  // 1. ADMIN ENDPOINTS
  if (apiPath.startsWith('/admin/')) {
    if (content.includes('adminAuth()')) {
      analysis.security = 'SECURE';
      analysis.authMethod = 'ADMIN_NEW';
    } else if (content.includes('getHybridAuth') && content.includes('checkIsSuperAdmin')) {
      analysis.security = 'SECURE';
      analysis.authMethod = 'ADMIN_OLD';
      analysis.recommendations.push('Överväg uppgradering till adminAuth()');
    } else if (content.includes('getHybridAuth')) {
      analysis.security = 'RISKY';
      analysis.authMethod = 'HYBRID_ONLY';
      analysis.issues.push('Admin endpoint utan superadmin-kontroll');
      analysis.recommendations.push('KRÄVS: Lägg till adminAuth() eller checkIsSuperAdmin()');
    } else {
      analysis.security = 'CRITICAL';
      analysis.authMethod = 'NONE';
      analysis.issues.push('Admin endpoint utan autentisering!');
      analysis.recommendations.push('AKUT: Implementera adminAuth()');
    }
  }
  
  // 2. GDPR ENDPOINTS
  else if (apiPath.startsWith('/gdpr/')) {
    if (content.includes('getHybridAuth') || content.includes('createSupabaseServerClient')) {
      analysis.security = 'PROTECTED';
      analysis.authMethod = 'USER_AUTH';
      analysis.details.hasAuth = true;
    } else if (apiPath.includes('/download/[token]')) {
      // Token-baserad nedladdning kan vara OK
      if (content.includes('token')) {
        analysis.security = 'TOKEN_PROTECTED';
        analysis.authMethod = 'TOKEN_AUTH';
      } else {
        analysis.security = 'RISKY';
        analysis.authMethod = 'NONE';
        analysis.issues.push('GDPR nedladdning utan token-validering');
      }
    } else {
      analysis.security = 'RISKY';
      analysis.authMethod = 'NONE';
      analysis.issues.push('GDPR endpoint utan autentisering');
      analysis.recommendations.push('Implementera användarautentisering');
    }
  }
  
  // 3. TRIAL ENDPOINTS
  else if (apiPath.startsWith('/trial/')) {
    if (content.includes('getHybridAuth') || content.includes('createSupabaseServerClient')) {
      analysis.security = 'PROTECTED';
      analysis.authMethod = 'USER_AUTH';
      analysis.details.hasAuth = true;
    } else {
      analysis.security = 'RISKY';
      analysis.authMethod = 'NONE';
      analysis.issues.push('Trial endpoint utan autentisering');
      analysis.recommendations.push('Implementera användarautentisering');
    }
  }
  
  // 4. AUTH ENDPOINTS
  else if (apiPath.startsWith('/auth/')) {
    // Auth endpoints kan vara publika för vissa operationer
    analysis.security = 'REVIEW_NEEDED';
    analysis.authMethod = 'MIXED';
    analysis.recommendations.push('Granska manuellt - auth endpoints kan vara publika');
  }
  
  // 5. SYSTEM/INFO ENDPOINTS
  else if (['/manifest', '/check-status', '/supabase-diagnosis', '/supabase-proxy'].includes(apiPath)) {
    // Dessa kan vara publika eller ha egen logik
    if (content.includes('adminAuth') || content.includes('getHybridAuth')) {
      analysis.security = 'PROTECTED';
      analysis.authMethod = 'AUTH_PRESENT';
      analysis.details.hasAuth = true;
    } else {
      analysis.security = 'REVIEW_NEEDED';
      analysis.authMethod = 'NONE';
      analysis.recommendations.push('Granska om endpoint ska vara publik eller skyddad');
    }
  }
  
  return analysis;
}

function performSecurityReview() {
  console.log('🔍 === SÄKERHETSGRANSKNING AV OKÄNDA ENDPOINTS ===\n');
  console.log(`📋 Granskar ${endpointsToReview.length} endpoints som behöver manuell kontroll\n`);
  
  const results = {
    secure: [],
    protected: [],
    risky: [],
    critical: [],
    reviewNeeded: [],
    notFound: []
  };
  
  endpointsToReview.forEach((endpoint, index) => {
    console.log(`🔍 [${index + 1}/${endpointsToReview.length}] Granskar: ${endpoint}`);
    
    const analysis = analyzeEndpointSecurity(endpoint);
    
    // Kategorisera resultat
    switch (analysis.security) {
      case 'SECURE':
        results.secure.push(analysis);
        console.log(`   ✅ SÄKER (${analysis.authMethod})`);
        break;
      case 'PROTECTED':
      case 'TOKEN_PROTECTED':
        results.protected.push(analysis);
        console.log(`   🔐 SKYDDAD (${analysis.authMethod})`);
        break;
      case 'RISKY':
        results.risky.push(analysis);
        console.log(`   ⚠️ RISKABEL (${analysis.authMethod})`);
        break;
      case 'CRITICAL':
        results.critical.push(analysis);
        console.log(`   ❌ KRITISK (${analysis.authMethod})`);
        break;
      case 'REVIEW_NEEDED':
        results.reviewNeeded.push(analysis);
        console.log(`   🤔 BEHÖVER GRANSKNING (${analysis.authMethod})`);
        break;
      default:
        results.notFound.push(analysis);
        console.log(`   ❓ FIL EJ HITTAD`);
    }
    
    if (analysis.issues.length > 0) {
      analysis.issues.forEach(issue => console.log(`      - ⚠️ ${issue}`));
    }
    if (analysis.recommendations.length > 0) {
      analysis.recommendations.forEach(rec => console.log(`      - 💡 ${rec}`));
    }
    console.log('');
  });
  
  // SAMMANFATTNING
  console.log('📊 === SÄKERHETSSAMMANFATTNING ===');
  console.log(`✅ Säkra endpoints: ${results.secure.length}`);
  console.log(`🔐 Skyddade endpoints: ${results.protected.length}`);
  console.log(`⚠️ Riskabla endpoints: ${results.risky.length}`);
  console.log(`❌ Kritiska endpoints: ${results.critical.length}`);
  console.log(`🤔 Behöver granskning: ${results.reviewNeeded.length}`);
  console.log(`❓ Ej hittade: ${results.notFound.length}\n`);
  
  // KRITISKA PROBLEM
  if (results.critical.length > 0) {
    console.log('🚨 === KRITISKA SÄKERHETSPROBLEM ===');
    results.critical.forEach(endpoint => {
      console.log(`❌ ${endpoint.path}`);
      endpoint.issues.forEach(issue => console.log(`   - ${issue}`));
      endpoint.recommendations.forEach(rec => console.log(`   - 🛠️ ${rec}`));
      console.log('');
    });
  }
  
  // RISKABLA ENDPOINTS
  if (results.risky.length > 0) {
    console.log('⚠️ === RISKABLA ENDPOINTS ===');
    results.risky.forEach(endpoint => {
      console.log(`⚠️ ${endpoint.path}`);
      endpoint.issues.forEach(issue => console.log(`   - ${issue}`));
      endpoint.recommendations.forEach(rec => console.log(`   - 🛠️ ${rec}`));
      console.log('');
    });
  }
  
  // PRIORITERADE ÅTGÄRDER
  console.log('🎯 === PRIORITERADE ÅTGÄRDER ===');
  
  if (results.critical.length > 0) {
    console.log(`🚨 AKUT (${results.critical.length}): Fixa kritiska säkerhetshål omedelbart!`);
  }
  
  if (results.risky.length > 0) {
    console.log(`⚠️ HÖG PRIORITET (${results.risky.length}): Lägg till autentisering`);
  }
  
  if (results.reviewNeeded.length > 0) {
    console.log(`🤔 MEDEL PRIORITET (${results.reviewNeeded.length}): Granska manuellt`);
  }
  
  if (results.critical.length === 0 && results.risky.length === 0) {
    if (results.reviewNeeded.length <= 3) {
      console.log('✅ UTMÄRKT! Inga kritiska säkerhetsproblem upptäckta!');
    } else {
      console.log('👍 BRA! Inga akuta säkerhetsproblem, bara manuell granskning behövs');
    }
  }
  
  return {
    totalReviewed: endpointsToReview.length,
    critical: results.critical.length,
    risky: results.risky.length,
    needsAction: results.critical.length + results.risky.length
  };
}

// Kör granskning
const reviewResults = performSecurityReview();

// Slutsats
console.log('\n🏁 === SLUTSATS ===');
if (reviewResults.needsAction === 0) {
  console.log('🎉 GRANSKNING SLUTFÖRD: Inga akuta säkerhetsåtgärder behövs!');
} else {
  console.log(`⚡ ÅTGÄRD KRÄVS: ${reviewResults.needsAction} endpoints behöver säkerhetsförbättringar`);
} 