import { headers } from 'next/headers';
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React from 'react';
import ReactMarkdown from 'react-markdown';

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
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold">{handbook.title}</h1>
            <p className="text-gray-500">Digital handbok</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="md:col-span-1">
              <nav className="space-y-1 sticky top-8">
                <h2 className="font-medium mb-4">Innehåll</h2>
                {publishedSections.map((section: Section) => (
                  <a
                    key={section.id}
                    href={`#section-${section.id}`}
                    className="block p-2 text-sm hover:bg-gray-50 rounded"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
            {/* Content */}
            <div className="md:col-span-3 space-y-12">
              {publishedSections.map((section: Section) => (
                <section key={section.id} id={`section-${section.id}`} className="space-y-6">
                  <h2 className="text-2xl font-semibold">{section.title}</h2>
                  <p className="text-gray-500">{section.description}</p>
                  <div className="space-y-8">
                    {(section.pages || []).map((page: Page) => (
                      <div key={page.id} className="space-y-2">
                        <h3 className="text-xl font-medium">{page.title}</h3>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{page.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>
        <footer className="bg-gray-50 border-t py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
            Powered by <span className="font-medium">Handbok.org</span>
          </div>
        </footer>
      </div>
    );
  }

  // Ny modern, luftig startsida
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] px-2">
      <main className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-10 flex flex-col gap-8 items-center">
        <div className="w-full text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Välkommen till Handbok.org</h1>
          <p className="text-lg text-gray-600 mb-8">Den digitala plattformen för bostadsrättsföreningar att skapa och dela handböcker.</p>
        </div>
        <a href="/create-handbook" className="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-full py-4 transition mb-2 shadow-sm">Skapa ny handbok</a>
        <form action="/view" method="get" className="w-full flex flex-col md:flex-row gap-2 items-center justify-center">
          <input
            type="text"
            name="company"
            placeholder="Ange namn på förening"
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 bg-[#f7f8fa] text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            autoComplete="off"
          />
          <button type="submit" className="px-6 py-3 rounded-full bg-white border-2 border-blue-600 text-blue-600 font-semibold text-base hover:bg-blue-50 hover:border-blue-700 transition shadow-sm">Visa</button>
        </form>
      </main>
    </div>
  );
}
