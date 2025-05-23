import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconDemo } from '@/components/ui/HandbookSectionIcons';

export default function HandbookSettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Handbok Inställningar</h1>
          <p className="text-lg text-muted-foreground">
            Anpassa hur ikoner visas i din handbok. Du kan välja mellan olika ikontyper 
            eller stänga av ikoner helt.
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Ikonalternativ</CardTitle>
              <CardDescription>
                Välj hur ikoner ska visas i din handbok. Alla alternativ fungerar automatiskt 
                baserat på sektionsnamnen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">🎨 Emojis (Rekommenderat)</CardTitle>
                    <CardDescription>
                      Färgglada, universella ikoner som fungerar överallt
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <span>Exempel:</span>
                      <span className="text-lg">🏠 📞 🚗 ♻️ 📋</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      <li>✅ Inga extra dependencies</li>
                      <li>✅ Färgglada och intuitiva</li>
                      <li>✅ Fungerar i alla webbläsare</li>
                      <li>✅ Perfekt för handböcker</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">🎯 Lucide Icons</CardTitle>
                    <CardDescription>
                      Professionella SVG-ikoner för konsistent design
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <span>Färg:</span>
                      <div className="w-4 h-4 bg-blue-600 rounded"></div>
                      <span>Blå</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      <li>✅ Standardval för shadcn/ui</li>
                      <li>✅ Över 1000 ikoner</li>
                      <li>✅ Skalbar SVG</li>
                      <li>✅ Konsistent design</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">🎨 Material Design</CardTitle>
                    <CardDescription>
                      Google's Material Design ikoner
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <span>Färg:</span>
                      <div className="w-4 h-4 bg-purple-600 rounded"></div>
                      <span>Lila</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      <li>✅ Välkända ikoner</li>
                      <li>✅ Material Design standard</li>
                      <li>✅ Stort utbud</li>
                      <li>✅ Responsiva</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">⚡ Font Awesome</CardTitle>
                    <CardDescription>
                      Populära ikoner från Font Awesome
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <span>Färg:</span>
                      <div className="w-4 h-4 bg-orange-600 rounded"></div>
                      <span>Orange</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      <li>✅ Mest använda ikoner</li>
                      <li>✅ Bred kompatibilitet</li>
                      <li>✅ Välkänd stil</li>
                      <li>✅ Många varianter</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Implementera i din handbok</CardTitle>
              <CardDescription>
                Så här uppdaterar du din befintliga handbok för att använda ikoner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">1. För befintliga HandbookSectionCard:</h4>
                <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
{`// Lägg till iconType prop (standard: emoji)
<HandbookSectionCard 
  title={section.title}
  description={section.description}
  iconType="emoji" // eller "lucide", "material", "fontawesome"
/>`}
                </pre>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">2. För navigation:</h4>
                <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
{`import { HandbookNavigation } from '@/components/HandbookNavigation'

<HandbookNavigation 
  sections={handbook.sections}
  iconType="emoji"
  showIcons={true}
/>`}
                </pre>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">3. För sektionsrubriker:</h4>
                <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
{`import { HandbookSectionHeader } from '@/components/HandbookSectionHeader'

<HandbookSectionHeader 
  title={section.title}
  description={section.description}
  iconType="emoji"
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Förhandsvisning av alla ikontyper</h2>
          <p className="text-muted-foreground mb-6">
            Här ser du hur alla dina handbok-sektioner kommer att se ut med olika ikontyper:
          </p>
          <IconDemo />
        </div>

        <div className="flex gap-4">
          <Button size="lg" className="flex-1">
            Aktivera Emojis (Rekommenderat)
          </Button>
          <Button variant="outline" size="lg">
            Visa Implementation Guide
          </Button>
        </div>
      </div>
    </div>
  );
} 