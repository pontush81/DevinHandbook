"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Menu, X } from 'lucide-react';

interface Page {
  id: string;
  title: string;
  content: string;
  order_index: number;
  section_id: string;
  is_published?: boolean;
}

interface Section {
  id: string;
  title: string;
  description: string;
  order_index: number;
  handbook_id: string;
  pages: Page[];
  is_published?: boolean;
}

interface Handbook {
  id: string;
  title: string;
  sections: Section[];
}

interface HomeHandbookClientProps {
  handbook: Handbook;
}

const HomeHandbookClient: React.FC<HomeHandbookClientProps> = ({ handbook }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
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
            <Menu className="w-7 h-7" />
          </button>
        </div>
      </header>
      <main className="w-full max-w-5xl mx-auto bg-white rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-12 shadow-none border border-gray-100 mt-8 mb-8">
        {/* Sidebar desktop */}
        <aside className="hidden md:block md:w-64 md:sticky md:top-24 mb-8 md:mb-0 md:mr-8">
          <nav className="space-y-1">
            <h2 className="font-semibold text-gray-700 mb-4 text-base tracking-tight uppercase">Innehåll</h2>
            {handbook.sections.map((section: Section) => (
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
                  <X className="w-6 h-6 text-gray-700" />
                </button>
              </div>
              <nav className="space-y-1">
                {handbook.sections.map((section: Section) => (
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
          {handbook.sections.map((section: Section) => (
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
};

export default HomeHandbookClient; 