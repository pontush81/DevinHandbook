'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Cookie, Shield, Settings, Info } from 'lucide-react';
import { useCookieConsent } from '@/components/CookieConsent';
import { safeLocalStorage } from '@/lib/safe-storage';
import Link from 'next/link';

export default function CookieSettingsPage() {
  const { hasConsent, consentType, updateConsent } = useCookieConsent();

  const handleAcceptAll = () => {
    updateConsent('accepted');
  };

  const handleDeclineAll = () => {
    updateConsent('declined');
  };

  const handleResetConsent = () => {
    if (typeof window !== 'undefined' && localStorage) {
          safeLocalStorage.removeItem('cookie_consent');
    safeLocalStorage.removeItem('cookie_consent_date');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Cookie className="h-8 w-8 text-amber-600" />
          Cookie-inställningar
        </h1>
        <p className="text-gray-600">
          Hantera dina cookie-preferenser för Handbok.org. Du kan när som helst ändra dessa inställningar.
        </p>
      </div>

      {/* Aktuell status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Aktuell status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasConsent ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Du har {consentType === 'accepted' ? 'accepterat alla cookies' : 'valt endast nödvändiga cookies'}
                </p>
                <p className="text-sm text-gray-600">
                  Inställning sparad: {typeof window !== 'undefined' && localStorage?.getItem('cookie_consent_date') 
                    ? new Date(safeLocalStorage.getItem('cookie_consent_date')!).toLocaleDateString('sv-SE')
                    : 'Okänt'}
                </p>
              </div>
              <Button onClick={handleResetConsent} variant="outline">
                Återställ val
              </Button>
            </div>
          ) : (
            <p className="text-gray-600">Du har inte gjort något val ännu.</p>
          )}
        </CardContent>
      </Card>

      {/* Cookie-kategorier */}
      <div className="space-y-6">
        {/* Nödvändiga cookies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Nödvändiga cookies
            </CardTitle>
            <CardDescription>
              Dessa cookies krävs för att webbplatsen ska fungera och kan inte avaktiveras.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h4 className="font-medium">Autentisering och säkerhet</h4>
                <p className="text-sm text-gray-600">
                  Hanterar inloggningssessioner och säkerhet (sb-auth cookies)
                </p>
                <p className="text-xs text-gray-500">
                  Lagringstid: 7 dagar
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={true} disabled />
                <span className="text-sm text-gray-500">Alltid på</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funktionella cookies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Funktionella cookies
            </CardTitle>
            <CardDescription>
              Förbättrar din upplevelse genom att komma ihåg dina preferenser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h4 className="font-medium">Användarpreferenser</h4>
                  <p className="text-sm text-gray-600">
                    Sparar inställningar som sidebar-läge och andra preferenser
                  </p>
                  <p className="text-xs text-gray-500">
                    Lagringstid: 7 dagar
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={consentType === 'accepted'} 
                    disabled
                  />
                  <span className="text-sm text-gray-500">
                    {consentType === 'accepted' ? 'På' : 'Av'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inga tracking cookies */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">✅ Integritetsvänligt</CardTitle>
            <CardDescription className="text-green-700">
              Vi använder INTE cookies för marknadsföring, spårning eller analys av tredje part.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Åtgärder */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Button onClick={handleAcceptAll} className="bg-blue-600 hover:bg-blue-700">
          Acceptera alla cookies
        </Button>
        <Button onClick={handleDeclineAll} variant="outline">
          Endast nödvändiga cookies
        </Button>
        <Button onClick={handleResetConsent} variant="ghost">
          Återställ alla val
        </Button>
      </div>

      {/* Information */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Mer information</h3>
        <p className="text-sm text-gray-600 mb-2">
          För mer detaljerad information om hur vi hanterar dina personuppgifter, 
          läs vår <Link href="/privacy" className="underline text-blue-600">integritetspolicy</Link>.
        </p>
        <p className="text-sm text-gray-600">
          Om du har frågor om cookies eller dataskydd, kontakta oss på{' '}
          <a href="mailto:info@handbok.org" className="underline text-blue-600">
            info@handbok.org
          </a>.
        </p>
      </div>
    </div>
  );
} 