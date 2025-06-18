import React from "react";

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Cookiepolicy</h1>
      
      <div className="prose max-w-none space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Senast uppdaterad:</strong> {new Date().toLocaleDateString('sv-SE')}
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Vad är cookies?</h2>
          <p className="mb-4">
            Cookies är små textfiler som lagras på din enhet (dator, telefon, surfplatta) när du besöker webbplatser. 
            De hjälper webbplatser att komma ihåg information om ditt besök, som dina preferenser och inloggningsstatus.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-green-800">✅ Vårt integritetslöfte</h3>
            <ul className="space-y-1 text-sm text-green-700">
              <li>• Vi använder <strong>INGA</strong> tracking-cookies</li>
              <li>• Vi använder <strong>INGA</strong> marknadsföringscookies</li>
              <li>• Vi spårar <strong>INTE</strong> din aktivitet på andra webbplatser</li>
              <li>• Vi delar <strong>INTE</strong> data med reklamnätverk</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Vilka cookies använder vi?</h2>
          
          <h3 className="text-lg font-medium mb-3 text-red-600">2.1 Nödvändiga cookies (kan inte avaktiveras)</h3>
          <p className="mb-4 text-sm text-gray-600">
            Dessa cookies krävs för att webbplatsen ska fungera och kan inte stängas av.
          </p>
          
          <div className="border rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Supabase autentisering</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Namn:</strong> sb-[project-id]-auth-token</p>
                <p><strong>Ändamål:</strong> Hanterar din inloggningssession</p>
                <p><strong>Lagringstid:</strong> 7 dagar</p>
                <p><strong>Säkerhet:</strong> Secure: true, HttpOnly: true, SameSite: Lax</p>
              </div>
              <div>
                <p><strong>Namn:</strong> sb-[project-id]-auth-refresh-token</p>
                <p><strong>Ändamål:</strong> Automatisk förnyelse av sessioner</p>
                <p><strong>Lagringstid:</strong> 30 dagar</p>
                <p><strong>Säkerhet:</strong> Secure: true, HttpOnly: true, SameSite: Lax</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-medium mb-3 text-blue-600">2.2 Funktionella cookies (kräver samtycke)</h3>
          <p className="mb-4 text-sm text-gray-600">
            Dessa cookies förbättrar din användarupplevelse men är inte nödvändiga för grundläggande funktionalitet.
          </p>
          
          <div className="border rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Användarpreferenser</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Namn:</strong> handbook-preferences</p>
                <p><strong>Ändamål:</strong> Sparar inställningar som sidebar-läge, tema</p>
                <p><strong>Lagringstid:</strong> 30 dagar</p>
                <p><strong>Typ:</strong> localStorage</p>
              </div>
              <div>
                <p><strong>Namn:</strong> cookie_consent</p>
                <p><strong>Ändamål:</strong> Minns ditt cookie-samtycke</p>
                <p><strong>Lagringstid:</strong> 1 år</p>
                <p><strong>Typ:</strong> localStorage</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Dina val och kontroll</h2>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2">Cookie-banner</h3>
            <p className="text-sm mb-2">När du besöker vår webbplats första gången kan du välja:</p>
            <ul className="text-sm space-y-1">
              <li>• <strong>"Acceptera alla":</strong> Tillåter både nödvändiga och funktionella cookies</li>
              <li>• <strong>"Endast nödvändiga":</strong> Bara cookies som krävs för grundläggande funktionalitet</li>
              <li>• <strong>"Visa detaljer":</strong> Mer information om våra cookies</li>
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Via vår webbplats</h3>
              <ul className="text-sm space-y-1">
                <li>• <a href="/cookie-settings" className="text-blue-600 hover:underline">Cookie-inställningar</a></li>
                <li>• Återställ samtycke: Rensa cookies och besök webbplatsen igen</li>
                <li>• Hjälp: <a href="mailto:info@handbok.org" className="text-blue-600 hover:underline">info@handbok.org</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Via din webbläsare</h3>
              <ul className="text-sm space-y-1">
                <li>• <strong>Chrome:</strong> Inställningar → Sekretess → Cookies</li>
                <li>• <strong>Firefox:</strong> Inställningar → Sekretess → Cookies</li>
                <li>• <strong>Safari:</strong> Inställningar → Sekretess → Cookies</li>
                <li>• <strong>Edge:</strong> Inställningar → Cookies och behörigheter</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Säkerhet och teknisk information</h2>
          
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Säkerhetsåtgärder</h3>
            <p className="text-sm mb-2">Alla våra cookies använder:</p>
            <ul className="text-sm space-y-1">
              <li>• <strong>Secure-flaggan:</strong> Skickas endast över HTTPS</li>
              <li>• <strong>SameSite-attribut:</strong> Skydd mot CSRF-attacker</li>
              <li>• <strong>HttpOnly:</strong> Skydd mot XSS-attacker (för känsliga cookies)</li>
              <li>• <strong>Kryptering:</strong> Känslig data krypteras både i vila och transit</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Tredjepartstjänster</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Supabase (Autentisering)</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Cookies:</strong> Autentisering och sessionshantering</li>
                <li><strong>Dataskydd:</strong> GDPR-kompatibel, data inom EU</li>
                <li><strong>Webbplats:</strong> supabase.com/privacy</li>
              </ul>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Stripe (Betalningar)</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Cookies:</strong> Endast under betalningsprocessen</li>
                <li><strong>Ändamål:</strong> Säkerhet och bedrägeriskydd</li>
                <li><strong>Dataskydd:</strong> PCI DSS-certifierad, GDPR-kompatibel</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Vanliga frågor</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold">F: Fungerar webbplatsen utan cookies?</h3>
              <p className="text-sm">S: Ja, grundläggande funktionalitet fungerar med endast nödvändiga cookies.</p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold">F: Spårar ni min aktivitet på andra webbplatser?</h3>
              <p className="text-sm">S: Nej, vi använder inga tracking-cookies eller tredjepartstjänster för spårning.</p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold">F: Vad händer om jag rengör cookies?</h3>
              <p className="text-sm">S: Du blir utloggad och måste logga in igen. Dina preferenser nollställs.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Kontakt</h2>
          <p className="mb-4">
            För frågor om cookies eller för att utöva dina rättigheter:
          </p>
          <ul className="space-y-1">
            <li><strong>E-post:</strong> <a href="mailto:info@handbok.org" className="text-blue-600 hover:underline">info@handbok.org</a></li>
            <li><strong>Adress:</strong> [FÖRETAGSADRESS]</li>
          </ul>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Klagomål</h3>
            <p className="text-sm">
              Om du har klagomål om vår cookieanvändning kan du kontakta 
              Integritetsskyddsmyndigheten (IMY) på <strong>imy.se</strong> eller 
              <strong>08-657 61 00</strong>.
            </p>
          </div>
        </section>

        <div className="border-t pt-6 mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Sammanfattning</h3>
            <p className="text-sm">
              Vi på Handbok.org använder cookies på ett integritetsvänligt sätt:
            </p>
            <ul className="text-sm space-y-1 mt-2">
              <li>✅ Endast nödvändiga cookies för grundläggande funktionalitet</li>
              <li>✅ Funktionella cookies för bättre användarupplevelse (med samtycke)</li>
              <li>❌ Inga tracking-cookies eller marknadsföringscookies</li>
              <li>❌ Inga tredjepartstjänster för spårning</li>
            </ul>
            <p className="text-sm mt-2 font-medium">
              Du har full kontroll över dina cookies via våra cookie-inställningar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 