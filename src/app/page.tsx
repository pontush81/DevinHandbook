import { headers } from 'next/headers';
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import HomeHandbookClient from './HomeHandbookClient';
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

export default async function HomePage() {
  const host = (await headers()).get('host') || '';
  console.log('SSR HOST:', host);
  const match = host.match(/^([a-z0-9-]+)\.handbok\.org$/);
  const subdomain = match ? match[1] : null;

  if (subdomain && subdomain !== 'www' && subdomain !== 'staging') {
    let handbook = null;
    try {
      handbook = await getHandbookBySubdomain(subdomain);
      console.log('SSR: handbook', JSON.stringify(handbook));
    } catch (error) {
      return <div>Fel vid laddning av handbok</div>;
    }
    if (!handbook) {
      return <div>Handbok saknas</div>;
    }
    // Filtrera sektioner och sidor på is_published
    const publishedSections = (handbook.sections || []).filter((section: any) => section.is_published !== false);
    publishedSections.forEach((section: any) => {
      section.pages = (section.pages || []).filter((page: any) => page.is_published !== false);
    });
    console.log('SSR: publishedSections', JSON.stringify(publishedSections));
    if (publishedSections.length === 0) {
      return <div>Handboken saknar innehåll eller är inte publicerad.</div>;
    }
    // Skicka data till client component
    return <HomeHandbookClient handbook={{ ...handbook, sections: publishedSections }} />;
  }

  // Ny modern, luftig startsida
  return (
    <MainLayout variant="landing" showHeader={false} noWhiteTop={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="relative max-w-4xl mx-auto px-6 py-16">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-6 bg-blue-100 text-blue-800 hover:bg-blue-100">
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
                <Button asChild className="w-full" size="lg">
                  <a href="/create-handbook">Skapa ny handbok</a>
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
                <div className="space-y-4">
                  <AutoSuggestHandbookSearch />
                  <Button variant="outline" className="w-full h-12">
                    Sök förening
                  </Button>
                </div>
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
