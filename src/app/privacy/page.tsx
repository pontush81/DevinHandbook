import React from "react";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Integritetspolicy</h1>
      
      <div className="prose max-w-none">
        <p className="mb-4">
          På Handbok.org värnar vi om din integritet. Denna policy förklarar hur vi samlar in, använder och skyddar dina personuppgifter.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Insamling av information</h2>
        <p>
          Vi samlar in följande information:
        </p>
        <ul className="list-disc ml-6 mb-4">
          <li>E-postadress</li>
          <li>Namn (om du väljer att ange det)</li>
          <li>Information om din användning av tjänsten</li>
          <li>IP-adress och enhetsinfo för säkerhetsändamål</li>
        </ul>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">2. Användning av information</h2>
        <p>
          Vi använder informationen för att:
        </p>
        <ul className="list-disc ml-6 mb-4">
          <li>Tillhandahålla och förbättra vår tjänst</li>
          <li>Kommunicera med dig</li>
          <li>Förhindra bedrägerier och säkerhetsincidenter</li>
        </ul>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">3. Cookies</h2>
        <p className="mb-4">
          Vi använder cookies för att hantera inloggningssessioner och förbättra användarupplevelsen.
          Du får välja vilka cookies du vill acceptera när du besöker vår webbplats.
        </p>
        
        <h3 className="text-lg font-medium mt-6 mb-3">Typer av cookies vi använder:</h3>
        <ul className="list-disc ml-6 mb-4">
          <li><strong>Nödvändiga cookies:</strong> Krävs för inloggning och grundläggande funktionalitet (kan inte avaktiveras)</li>
          <li><strong>Funktionella cookies:</strong> Sparar dina preferenser som sidebar-inställningar</li>
          <li><strong>Inga tracking-cookies:</strong> Vi använder inte cookies för marknadsföring eller spårning av tredje part</li>
        </ul>
        
        <p className="mb-4">
          Du kan när som helst ändra dina cookie-inställningar genom att rensa din webbläsares cookies och besöka vår webbplats igen.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">4. Delning av information</h2>
        <p>
          Vi delar inte dina personuppgifter med tredje part förutom i följande fall:
        </p>
        <ul className="list-disc ml-6 mb-4">
          <li>När det krävs enligt lag</li>
          <li>Med tjänsteleverantörer som hjälper oss att driva vår tjänst</li>
          <li>I händelse av en sammanslagning eller förvärv</li>
        </ul>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">5. Datasäkerhet</h2>
        <p>
          Vi vidtar rimliga åtgärder för att skydda dina uppgifter, men ingen internetöverföring är helt säker.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">6. Dina rättigheter</h2>
        <p>
          Du har rätt att:
        </p>
        <ul className="list-disc ml-6 mb-4">
          <li>Få tillgång till dina personuppgifter</li>
          <li>Begära rättelse av felaktiga uppgifter</li>
          <li>Begära radering av dina uppgifter</li>
          <li>Invända mot viss behandling</li>
        </ul>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">7. Ändringar i policyn</h2>
        <p>
          Vi kan komma att uppdatera denna policy. Vid väsentliga förändringar kommer vi att meddela dig.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">8. Kontakt</h2>
        <p>
          Om du har frågor om vår integritetspolicy, kontakta oss på info@handbok.org.
        </p>
        
        <p className="mt-8 text-sm text-gray-500">
          Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
        </p>
      </div>
    </div>
  );
} 