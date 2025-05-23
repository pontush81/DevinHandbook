"use client";

import { getHandbookBySubdomain } from '@/lib/handbook-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MainLayout } from '@/components/layout/MainLayout';
import AutoSuggestHandbookSearch from "@/components/AutoSuggestHandbookSearch";

export const dynamic = 'force-dynamic';

interface Section {
  id: string;
  title: string;
  description: string;
  order_index: number;
  handbook_id: string;
  pages: Page[];
}

interface Page {
  id: string;
  title: string;
  content: string;
  order_index: number;
  section_id: string;
}

export default function HomePage() {
  // Vi kan inte använda server-side headers med "use client"
  // Detta behöver omarbetas för att fungera på klientsidan
  
  // För tillfället, visa bara startsidan
  return (
    <MainLayout variant="landing" showHeader={false} noWhiteTop={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="relative max-w-4xl mx-auto px-6 py-16">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-6">
              ✨ Ny plattform för bostadsrättsföreningar
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Välkommen till
              <span className="text-blue-600"> Handbok.org</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Den digitala plattformen för bostadsrättsföreningar att skapa
              och dela handböcker.
            </p>
          </div>

          {/* Action Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            
            {/* Create Handbook Card */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02]">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <CardTitle className="text-xl">Skapa handbok</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">
                  Starta din första handbok och börja dokumentera rutiner och information.
                </p>
                <Button className="w-full" size="lg" onClick={() => window.location.href = '/create-handbook?new=true'}>
                  Skapa ny handbok
                </Button>
              </CardContent>
            </Card>
            
            {/* Find Association Card */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02]">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔍</span>
                </div>
                <CardTitle className="text-xl">Hitta förening</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">
                  Sök efter din bostadsrättsförening och få tillgång till er handbok.
                </p>
                <Button className="w-full" size="lg" onClick={() => window.location.href = '/search'}>
                  Sök efter förening
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-sm">
            <CardContent className="py-8">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Betrodd av föreningar över hela Sverige
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">150+</div>
                  <div className="text-sm text-gray-600">Föreningar</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">500+</div>
                  <div className="text-sm text-gray-600">Handböcker</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">2000+</div>
                  <div className="text-sm text-gray-600">Medlemmar</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* FAQ Section */}
          <div className="mt-12 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-6">
              Vanliga frågor
            </h3>
            <div className="space-y-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-sm p-4">
                <h4 className="font-medium text-gray-900 mb-2">Vad är en digital bostadsrättsföreningshandbok?</h4>
                <p className="text-gray-600 text-sm">En digital handbok för bostadsrättsföreningar är en webbaserad plattform där all viktig information om föreningen samlas. Här finns stadgar, regler, kontaktuppgifter, felanmälan och annan information som medlemmar behöver ha tillgång till.</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-sm p-4">
                <h4 className="font-medium text-gray-900 mb-2">Hur skapar jag en handbok för min förening?</h4>
                <p className="text-gray-600 text-sm">Det är enkelt! Klicka på 'Skapa handbok' ovan, följ den guidade processen, ange föreningens namn och välj en unik subdomän. Efter betalning kan du börja fylla din handbok med innehåll.</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-sm p-4">
                <h4 className="font-medium text-gray-900 mb-2">Vad kostar tjänsten?</h4>
                <p className="text-gray-600 text-sm">Tjänsten kostar 990 kr per år för en förening, oavsett storlek. I priset ingår obegränsad lagring, egen subdomän, säkerhetskopiering och support.</p>
              </div>
            </div>
          </div>
          
          {/* Login Link */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              Har du redan ett konto?{" "}
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                Logga in här
              </a>
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
