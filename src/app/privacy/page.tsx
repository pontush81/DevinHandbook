import React from "react";
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Integritetspolicy</h1>
      
      <div className="prose max-w-none space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Senast uppdaterad:</strong> {new Date().toLocaleDateString('sv-SE')}
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Inledning</h2>
          <p className="mb-4">
            Handbok.org värnar om din integritet och följer EU:s dataskyddsförordning (GDPR). 
            Denna policy förklarar hur vi samlar in, använder och skyddar dina personuppgifter 
            när du använder vår tjänst för digitala handböcker för bostadsrättsföreningar.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Personuppgiftsansvarig:</h3>
            <ul className="space-y-1 text-sm">
              <li><strong>Företag:</strong> [FÖRETAGSNAMN]</li>
              <li><strong>Organisationsnummer:</strong> [ORGANISATIONSNUMMER]</li>
              <li><strong>Adress:</strong> [FÖRETAGSADRESS]</li>
              <li><strong>E-post:</strong> info@handbok.org</li>
              <li><strong>Telefon:</strong> [TELEFONNUMMER]</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Vilka personuppgifter samlar vi in?</h2>
          
          <h3 className="text-lg font-medium mb-3">2.1 Kontoinformation</h3>
          <ul className="list-disc ml-6 mb-4">
            <li>E-postadress (för inloggning och kommunikation)</li>
            <li>Namn (om du väljer att ange det)</li>
            <li>Lösenord (krypterat)</li>
          </ul>

          <h3 className="text-lg font-medium mb-3">2.2 Föreningsinformation</h3>
          <ul className="list-disc ml-6 mb-4">
            <li>Bostadsrättsföreningens namn</li>
            <li>Organisationsnummer (för föreningen)</li>
            <li>Kontaktuppgifter för föreningen</li>
          </ul>

          <h3 className="text-lg font-medium mb-3">2.3 Innehållsdata</h3>
          <ul className="list-disc ml-6 mb-4">
            <li>Text och bilder du lägger till i handboken</li>
            <li>Strukturell information (sektioner, sidor)</li>
            <li>Redigeringshistorik</li>
          </ul>

          <h3 className="text-lg font-medium mb-3">2.4 Teknisk information</h3>
          <ul className="list-disc ml-6 mb-4">
            <li>IP-adress</li>
            <li>Webbläsartyp och version</li>
            <li>Operativsystem</li>
            <li>Tidsstämplar för användning</li>
            <li>Felloggar och säkerhetsloggar</li>
          </ul>

          <h3 className="text-lg font-medium mb-3">2.5 Betalningsinformation</h3>
          <ul className="list-disc ml-6 mb-4">
            <li>Faktureringsadress</li>
            <li>Betalningsmetod (hanteras av Stripe - vi lagrar inte kortuppgifter)</li>
            <li>Betalningshistorik</li>
            <li>Prenumerationsstatus</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Rättslig grund för behandling</h2>
          <p className="mb-4">Vi behandlar dina personuppgifter baserat på:</p>
          <ul className="list-disc ml-6 mb-4">
            <li><strong>Avtalsuppfyllelse:</strong> För att tillhandahålla tjänsten enligt våra användarvillkor</li>
            <li><strong>Berättigat intresse:</strong> För att förbättra tjänsten och säkerställa säkerhet</li>
            <li><strong>Rättslig förpliktelse:</strong> För bokföring och skatteändamål</li>
            <li><strong>Samtycke:</strong> För icke-nödvändiga cookies och marknadsföring (om tillämpligt)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Tredjepartstjänster</h2>
          <p className="mb-4">Vi använder följande betrodda tjänsteleverantörer:</p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Supabase (Databas)</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Ändamål:</strong> Lagring av användardata</li>
                <li><strong>Datalagring:</strong> Inom EU</li>
                <li><strong>Dataskydd:</strong> GDPR-kompatibel</li>
                <li><strong>Avtal:</strong> Vi har DPA-avtal</li>
              </ul>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Stripe (Betalningar)</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Ändamål:</strong> Betalningshantering</li>
                <li><strong>Data:</strong> Namn, e-post, faktureringsadress</li>
                <li><strong>Dataskydd:</strong> PCI DSS-certifierad</li>
              </ul>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Vercel (Hosting)</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Ändamål:</strong> Webbplatsens hosting</li>
                <li><strong>Datalagring:</strong> Globalt CDN</li>
                <li><strong>Dataskydd:</strong> GDPR-kompatibel</li>
              </ul>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Resend (E-post)</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Ändamål:</strong> E-postkommunikation</li>
                <li><strong>Data:</strong> E-postadress, namn</li>
                <li><strong>Dataskydd:</strong> GDPR-kompatibel</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          {/* DPA Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <Shield className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                🔒 Personuppgiftsbiträdesavtal (DPA)
              </h3>
              <p className="text-green-800 text-sm leading-relaxed mb-3">
                Vi har personuppgiftsbiträdesavtal med samtliga leverantörer som behandlar 
                personuppgifter för vår räkning, inklusive Supabase, Stripe, Vercel och Resend. 
                Dessa avtal säkerställer att dina personuppgifter behandlas i enlighet med GDPR 
                och andra tillämpliga dataskyddslagar.
              </p>
                              <div className="text-green-800 text-sm">
                  <strong>Alla våra leverantörer:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Använder Standard Contractual Clauses för dataöverföringar utanför EU</li>
                    <li>Implementerar lämpliga tekniska och organisatoriska säkerhetsåtgärder</li>
                    <li>Genomgår regelbundna tredjepartsrevisioner (SOC 2, ISO 27001)</li>
                    <li>Stöder dina rättigheter enligt GDPR</li>
                  </ul>
                  <p className="mt-3 text-sm">
                    <strong>För mer information:</strong> Se vår detaljerade{' '}
                    <a href="/legal/dpa-guide" className="text-green-700 underline hover:text-green-900">
                      DPA-implementeringsguide
                    </a>
                  </p>
                </div>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">5. Dina rättigheter enligt GDPR</h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 text-sm">
            <strong>Viktigt om dataexport:</strong> Du ansvarar själv för att exportera ditt innehåll 
            inom angiven tidsram. Efter kontouppsägning bevaras data i 90 dagar, därefter raderas 
            all information permanent och kan inte återställas.
          </p>
        </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2">7.3 Rätt till radering ("rätten att bli glömd")</h3>
            <ul className="list-disc ml-6 mb-2">
              <li>Begära att vi raderar dina personuppgifter</li>
              <li>Vissa undantag kan gälla (t.ex. bokföringsskyldighet)</li>
            </ul>
            <p className="text-sm font-medium text-green-800 mt-2">
              <strong>Viktigt:</strong> Om du begär radering av dina uppgifter försvinner också tillgången 
              till det innehåll du har skapat i tjänsten. Export bör ske innan radering begärs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Rätt till information</h3>
              <p className="text-sm">Få information om vilka uppgifter vi behandlar</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Rätt till rättelse</h3>
              <p className="text-sm">Begära korrigering av felaktiga uppgifter</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Rätt till dataportabilitet</h3>
              <p className="text-sm">Få ut dina uppgifter i strukturerat format</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Rätt att invända</h3>
              <p className="text-sm">Invända mot behandling baserad på berättigat intresse</p>
            </div>
          </div>
          
          <p className="mt-4 font-medium">
            Kontakta oss för att utöva dina rättigheter: <a href="mailto:info@handbok.org" className="text-blue-600 hover:underline">info@handbok.org</a>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Cookies och spårning</h2>
          <p className="mb-4">
            Vi använder cookies för att förbättra din upplevelse. Detaljerad information finns i vår 
            <a href="/cookie-policy" className="text-blue-600 hover:underline"> cookiepolicy</a>.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Kort sammanfattning:</h3>
            <ul className="space-y-1 text-sm">
              <li>✅ <strong>Nödvändiga cookies:</strong> Autentisering och grundläggande funktionalitet</li>
              <li>✅ <strong>Funktionella cookies:</strong> Sparar dina preferenser</li>
              <li>❌ <strong>Inga tracking-cookies:</strong> Vi använder inte cookies för spårning eller marknadsföring</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Kontakt och klagomål</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Kontakta oss</h3>
              <p className="text-sm mb-2">För frågor om denna policy eller dina personuppgifter:</p>
              <ul className="text-sm space-y-1">
                <li><strong>E-post:</strong> info@handbok.org</li>
                <li><strong>Postadress:</strong> [FÖRETAGSADRESS]</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Klagomål till tillsynsmyndighet</h3>
              <p className="text-sm mb-2">Du har rätt att lämna klagomål till Integritetsskyddsmyndigheten:</p>
              <ul className="text-sm space-y-1">
                <li><strong>Webbplats:</strong> imy.se</li>
                <li><strong>Telefon:</strong> 08-657 61 00</li>
                <li><strong>E-post:</strong> imy@imy.se</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="border-t pt-6 mt-8">
          <p className="text-sm text-gray-600 italic">
            Denna integritetspolicy är utformad för att vara tydlig och transparent. 
            Har du frågor? Kontakta oss gärna.
          </p>
        </div>
      </div>
    </div>
  );
} 