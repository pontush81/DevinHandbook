import React from "react";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Användarvillkor</h1>
      
      <div className="prose max-w-none space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Senast uppdaterad:</strong> {new Date().toLocaleDateString('sv-SE')}
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Allmänt</h2>
          <p className="mb-4">
            Välkommen till Handbok.org! Dessa användarvillkor ("Villkoren") reglerar din användning av vår tjänst. 
            Genom att registrera ett konto eller använda tjänsten accepterar du dessa villkor.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Tjänsteleverantör:</h3>
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
          <h2 className="text-2xl font-semibold mb-4">2. Tjänstebeskrivning</h2>
          
          <h3 className="text-lg font-medium mb-3">2.1 Vad vi erbjuder</h3>
          <p className="mb-4">Handbok.org är en Software-as-a-Service (SaaS) plattform som erbjuder:</p>
          <ul className="list-disc ml-6 mb-4">
            <li>Digitala handböcker för bostadsrättsföreningar</li>
            <li>Strukturerad innehållshantering</li>
            <li>Användarhantering och behörigheter</li>
            <li>Responsiv design för alla enheter</li>
            <li>Export- och utskriftsfunktioner</li>
          </ul>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800">
              <strong>Viktigt:</strong> Vi ansvarar inte för beslut eller åtgärder som vidtas med stöd av information 
            i handboken. Innehållet utgör inte juridisk rådgivning 
              eller garanti för efterlevnad av lagar. Användare ansvarar själva för att granska informationen.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Priser och betalning</h2>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Månadsvis prenumeration</h3>
              <p className="text-2xl font-bold text-blue-600">149 kr</p>
              <p className="text-sm text-gray-600">per månad (inklusive moms)</p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-semibold mb-2">Årlig prenumeration</h3>
              <p className="text-2xl font-bold text-green-600">1490 kr</p>
              <p className="text-sm text-gray-600">per år (inklusive moms)</p>
              <p className="text-xs text-green-700 font-medium">Spara 298 kr per år!</p>
            </div>
          </div>
          
          <ul className="space-y-2 mb-4">
            <li>✅ <strong>30 dagars provperiod:</strong> Kostnadsfri för nya användare</li>
            <li>✅ <strong>Betalning via Stripe:</strong> Säker hantering av kort (Visa, Mastercard, American Express)</li>
            <li>✅ <strong>Automatisk förnyelse:</strong> Enligt vald faktureringsperiod</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Uppsägning och återbetalning</h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2 text-red-800">Återbetalningspolicy</h3>
            <ul className="space-y-1 text-sm text-red-700">
              <li>• <strong>Provperiod:</strong> Ingen kostnad, ingen återbetalning</li>
              <li>• <strong>Månadsvis prenumeration:</strong> Ingen återbetalning för påbörjad månad</li>
              <li>• <strong>Årlig prenumeration:</strong> Ingen återbetalning. Årsabonnemang är bindande för hela året</li>
              <li>• <strong>Återbetalningar:</strong> Vid tekniska fel för månadsprenumeration behandlas inom 5-10 arbetsdagar</li>
            </ul>
          </div>
          
          <h3 className="text-lg font-medium mb-3">Kontoavslutning</h3>
          <p className="mb-2">Vid uppsägning:</p>
          <ul className="list-disc ml-6 space-y-1 text-sm">
            <li>Ditt konto pausas omedelbart</li>
            <li>Du kan exportera dina data i 60 dagar</li>
            <li>Data raderas permanent efter 90 dagar</li>
            <li>Handbok-webbplatsen blir otillgänglig omedelbart</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Innehåll och rättigheter</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Ditt innehåll</h3>
              <ul className="text-sm space-y-1">
                <li>• Du behåller äganderätten till allt innehåll</li>
                <li>• Du ger oss licens att visa och bearbeta innehållet</li>
                <li>• Du ansvarar för att innehållet inte kränker andras rättigheter</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Förbjudet innehåll</h3>
              <ul className="text-sm space-y-1">
                <li>• Innehåll som bryter mot svensk lag</li>
                <li>• Förtalande eller trakasserande material</li>
                <li>• Upphovsrättskränkningar</li>
                <li>• Virus eller skadlig kod</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Ansvarsbegränsning</h2>
          
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Tjänsten tillhandahålls "som den är"</h3>
            <ul className="text-sm space-y-1 mb-4">
              <li>• Vi ger inga garantier för tjänstens funktionalitet</li>
              <li>• Vi garanterar inte att tjänsten är felfri eller alltid tillgänglig</li>
              <li>• Du använder tjänsten på egen risk</li>
            </ul>
            
            <h3 className="font-semibold mb-2">Maximal ersättning</h3>
            <p className="text-sm font-medium text-red-600">
              Vårt totala ansvar är begränsat till det lägsta av: (a) 1000 kr, eller (b) det belopp du betalat 
              för tjänsten under den senaste månaden. Denna begränsning gäller även om vi har informerats om 
              risken för sådan skada.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Kontakt och support</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Kundtjänst</h3>
              <ul className="text-sm space-y-1">
                <li><strong>E-post:</strong> info@handbok.org</li>
                <li><strong>Svarstid:</strong> Vi strävar efter att svara inom 24 timmar under vardagar</li>
                <li><strong>Språk:</strong> Support sker på svenska</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Konsumenters rättigheter</h3>
              <ul className="text-sm space-y-1">
                <li>• Allmänna reklamationsnämnden (ARN)</li>
                <li>• EU:s plattform för onlinetvistlösning</li>
                <li>• Växjö tingsrätt för tvister</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Ändringar i villkoren</h2>
          <p className="mb-4">
            Vi kan ändra dessa villkor när som helst. Väsentliga ändringar meddelas minst 30 dagar i förväg 
            via e-post eller notifikation på webbplatsen.
          </p>
          
          <p className="text-sm font-medium text-blue-600">
            Vi rekommenderar att du granskar villkoren regelbundet.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Gällande lag</h2>
          <p className="mb-4">
            Dessa villkor styrs av svensk lag. Eventuella tvister avgörs i svensk domstol med 
            Växjö tingsrätt som första instans.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm">
              <strong>Relaterade dokument:</strong> Läs även vår 
              <a href="/privacy" className="text-blue-600 hover:underline"> integritetspolicy</a> och 
              <a href="/cookie-policy" className="text-blue-600 hover:underline"> cookiepolicy</a> för 
              fullständig information om hur vi behandlar dina uppgifter.
            </p>
          </div>
        </section>

        <div className="border-t pt-6 mt-8">
          <p className="text-sm text-gray-600 italic">
            Har du frågor om dessa villkor? Kontakta oss på info@handbok.org så hjälper vi dig gärna.
          </p>
        </div>
      </div>
    </div>
  );
} 