const dns = require('dns');
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const subdomain = process.argv[2] || 'test';
const domain = `${subdomain}.handbok.org`;

console.log(`\n====== SUBDOMAIN TEST: ${domain} ======\n`);

// 1. Kontrollera DNS-konfiguration
function checkDNS() {
  return new Promise((resolve) => {
    console.log('1. Kontrollerar DNS-konfiguration...');
    
    dns.lookup(domain, (err, address) => {
      if (err) {
        console.log('❌ DNS-uppslagning misslyckades');
        console.log(`   Fel: ${err.message}`);
        console.log('   Tips: Kontrollera att DNS-konfigurationen är korrekt inställd');
        console.log('         och att wildcard-domänen *.handbok.org är konfigurerad.');
        resolve(false);
      } else {
        console.log('✅ DNS-uppslagning lyckades');
        console.log(`   IP-adress: ${address}`);
        resolve(true);
      }
    });
  });
}

// 2. Testa HTTP-anslutning till domänen
function testConnection() {
  return new Promise((resolve) => {
    console.log('\n2. Testar HTTP-anslutning...');
    
    const req = https.request({
      hostname: domain,
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 5000,
    }, (res) => {
      console.log(`✅ Anslutning lyckades (HTTP ${res.statusCode})`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (data.includes('Handbook Not Found')) {
          console.log('⚠️ Varning: Handboken hittades inte');
          console.log('   Tips: Kontrollera att en handbok med subdomänen existerar i databasen');
        } else if (data.includes('handbook') || data.includes('Handbok')) {
          console.log('✅ Handbokssidan laddades framgångsrikt');
        }
        
        resolve(true);
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ HTTP-anslutning misslyckades');
      console.log(`   Fel: ${err.message}`);
      console.log('   Tips: Kontrollera att Vercel-domänen är korrekt konfigurerad');
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('❌ HTTP-anslutning timeout');
      console.log('   Tips: Kontrollera att Vercel-deploymentet är aktivt');
      resolve(false);
    });
    
    req.end();
  });
}

// 3. Visa nästa steg
function showNextSteps(dnsSuccess, connectionSuccess) {
  console.log('\n====== TESTRESULTAT ======\n');
  
  if (dnsSuccess && connectionSuccess) {
    console.log('🎉 Grundläggande konfiguration verkar fungera!');
  } else {
    console.log('⚠️ Vissa tester misslyckades, se detaljer ovan.');
  }
  
  console.log('\n====== NÄSTA STEG ======\n');
  console.log('1. Skapa en testhandbok om du inte redan har gjort det:');
  console.log(`   node scripts/create-test-handbook.js ${subdomain}`);
  console.log('\n2. Besök handboken i webbläsaren:');
  console.log(`   https://${domain}`);
  console.log('\n3. Kontrollera om handboken finns i databasen:');
  console.log(`   curl 'https://handbok.org/api/check-handbook?subdomain=${subdomain}'`);
  
  rl.close();
}

// Kör tester
async function runTests() {
  const dnsSuccess = await checkDNS();
  const connectionSuccess = dnsSuccess ? await testConnection() : false;
  showNextSteps(dnsSuccess, connectionSuccess);
}

runTests(); 