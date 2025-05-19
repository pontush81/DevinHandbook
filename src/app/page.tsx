import { headers } from 'next/headers';
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

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
    // --- NY HEADER & NAVIGATION ---
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex flex-col items-center justify-center px-2">
        {/* Sticky header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 w-full">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-xl tracking-tight text-gray-900">Handbok.org</span>
            </div>
            {/* Mobil menyknapp */}
            <button className="md:hidden ml-2 p-2 rounded hover:bg-gray-100 text-gray-700" onClick={() => setSidebarOpen(true)} aria-label="Öppna meny">
              <Bars3Icon className="w-7 h-7" />
            </button>
          </div>
        </header>
        <main className="w-full max-w-5xl mx-auto bg-white rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-12 shadow-none border border-gray-100 mt-8 mb-8">
          {/* Sidebar desktop */}
          <aside className="hidden md:block md:w-64 md:sticky md:top-24 mb-8 md:mb-0 md:mr-8">
            <nav className="space-y-1">
              <h2 className="font-semibold text-gray-700 mb-4 text-base tracking-tight uppercase">Innehåll</h2>
              {publishedSections.map((section: Section) => (
                <a
                  key={section.id}
                  href={`#section-${section.id}`}
                  className="block px-0 py-2 border-l-4 border-transparent hover:border-green-500 hover:bg-green-50 text-base font-medium text-gray-700 hover:text-green-700 rounded transition mb-1"
                  style={{ fontWeight: 500 }}
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>
          {/* Mobil drawer */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/30 flex md:hidden" onClick={() => setSidebarOpen(false)}>
              <aside className="bg-white w-64 h-full shadow-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <span className="font-bold text-gray-900 text-lg">Innehåll</span>
                  <button onClick={() => setSidebarOpen(false)} className="p-2 rounded hover:bg-gray-100">
                    <XMarkIcon className="w-6 h-6 text-gray-700" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {publishedSections.map((section: Section) => (
                    <a
                      key={section.id}
                      href={`#section-${section.id}`}
                      className="block px-0 py-2 border-l-4 border-transparent hover:border-green-500 hover:bg-green-50 text-base font-medium text-gray-700 hover:text-green-700 rounded transition mb-1"
                      style={{ fontWeight: 500 }}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </aside>
            </div>
          )}
          {/* Content */}
          <section className="flex-1 w-full max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-10 tracking-tight leading-tight">{handbook.title}</h1>
            {publishedSections.map((section: Section) => (
              <div key={section.id} id={`section-${section.id}`} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2 tracking-tight leading-tight">{section.title}</h2>
                <p className="text-gray-500 mb-8 text-base max-w-2xl leading-relaxed">{section.description}</p>
                <div className="space-y-12">
                  {(section.pages || []).map((page: Page) => (
                    <div key={page.id} className="space-y-3">
                      <h3 className="text-xl font-semibold text-gray-800 mb-1 tracking-tight leading-tight">{page.title}</h3>
                      <div className="prose prose-lg max-w-none">
                        <ReactMarkdown>{page.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </main>
        <footer className="bg-white border-t border-gray-100 w-full max-w-5xl mx-auto rounded-b-3xl p-6 text-center text-gray-400 text-sm">
          Powered by <span className="font-medium text-gray-900">Handbok.org</span>
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
