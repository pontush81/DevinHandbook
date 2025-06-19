import { PWATest } from '@/components/PWATest';

export default function PWATestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            PWA Test - Handbok App
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Testa din Progressive Web App-funktionalitet. Denna sida hjälper dig att verifiera 
            att alla PWA-funktioner fungerar korrekt.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Funktionalitet</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>App-manifest (manifest.json)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Service Worker för offline-stöd</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Installationsbar från webbläsaren</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Fullskärmsläge (standalone)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Cache för snabbare laddning</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>PWA-ikoner för alla plattformar</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Så här testar du</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <strong className="text-gray-900">1. Desktop (Chrome/Edge):</strong>
                <br />
                Titta efter installationsikonen i adressfältet eller använd menyn "Installera Handbok"
              </div>
              <div>
                <strong className="text-gray-900">2. Android:</strong>
                <br />
                Chrome visar "Lägg till på hemskärmen" banner. Eller använd meny → "Installera app"
              </div>
              <div>
                <strong className="text-gray-900">3. iOS (Safari):</strong>
                <br />
                Tryck på delningsknappen ⎦ och välj "Lägg till på hemskärmen"
              </div>
              <div>
                <strong className="text-gray-900">4. Offline-test:</strong>
                <br />
                Installera appen, stäng av internet och öppna appen igen
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <PWATest />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🎉 Grattis! Din app är nu PWA-kompatibel
          </h3>
          <p className="text-blue-800 text-sm">
            Användare kan nu installera din handbok-app direkt från webbläsaren och få en 
            app-liknande upplevelse med offline-stöd, snabbare laddning och hemskärmsikon.
          </p>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Tillbaka till startsidan
          </a>
        </div>
      </div>
    </div>
  );
} 