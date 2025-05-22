import { headers } from 'next/headers';
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Menu, X } from 'lucide-react';
import HomeHandbookClient from './HomeHandbookClient';
import AutoSuggestHandbookSearch from "@/components/AutoSuggestHandbookSearch";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MainLayout } from '@/components/layout/MainLayout';

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

  // Ny modern, luftig startsida med reducerad toppmarginal
  return (
    <MainLayout variant="landing" showHeader={false}>
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <main className="w-full max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-10 flex flex-col gap-8 mt-8">
          <div className="w-full text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight">Välkommen till Handbok.org</h1>
            <p className="text-lg text-gray-600 mb-8">Den digitala plattformen för bostadsrättsföreningar att skapa och dela handböcker.</p>
          </div>
          <div className="w-full flex flex-col gap-6">
            <Button asChild variant="default" className="w-full h-14 text-lg font-medium rounded-lg py-4 mb-0">
              <a href="/create-handbook">Skapa ny handbok</a>
            </Button>
            <div className="w-full">
              <AutoSuggestHandbookSearch />
            </div>
          </div>
        </main>
      </div>
    </MainLayout>
  );
}
