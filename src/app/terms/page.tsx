import React from "react";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Användarvillkor</h1>
      
      <div className="prose max-w-none">
        <p className="mb-4">
          Välkommen till Handbok.org! Genom att använda vår tjänst godkänner du följande villkor.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Användning av tjänsten</h2>
        <p>
          Handbok.org erbjuder en plattform för att skapa och hantera digitala handböcker för föreningar.
          Som användare förbinder du dig att använda tjänsten i enlighet med gällande lagar och regler.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">2. Användardata</h2>
        <p>
          Vi sparar den information som krävs för att tillhandahålla tjänsten. 
          Mer information om hur vi hanterar dina personuppgifter finns i vår integritetspolicy.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">3. Användarkonton</h2>
        <p>
          Du ansvarar för att hålla dina inloggningsuppgifter säkra och för alla aktiviteter som sker via ditt konto.
          Om du misstänker obehörig åtkomst till ditt konto, kontakta oss omedelbart.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">4. Innehåll</h2>
        <p>
          Du ansvarar för allt innehåll som du laddar upp eller skapar med tjänsten.
          Innehållet får inte bryta mot svensk lag eller kränka andras rättigheter.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">5. Avslutande av tjänsten</h2>
        <p>
          Vi förbehåller oss rätten att avsluta eller begränsa tillgången till tjänsten för användare som bryter mot våra villkor.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">6. Ändringar i villkoren</h2>
        <p>
          Vi kan komma att uppdatera dessa villkor. Vid väsentliga förändringar kommer vi att meddela dig.
          Genom att fortsätta använda tjänsten efter sådana ändringar accepterar du de uppdaterade villkoren.
        </p>
        
        <p className="mt-8 text-sm text-gray-500">
          Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
        </p>
      </div>
    </div>
  );
} 