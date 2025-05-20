"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Menu, X } from 'lucide-react';

interface HandbookPage {
  id: string;
  title: string;
  content: string;
}
interface HandbookSection {
  id: string;
  title: string;
  description: string;
  pages: HandbookPage[];
}
interface Handbook {
  name: string;
  sections: HandbookSection[];
}

function useActiveSection(sectionIds: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    function onScroll() {
      let found = null;
      for (const id of sectionIds) {
        const el = document.getElementById(`section-${id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < 120) found = id;
        }
      }
      setActive(found || sectionIds[0] || null);
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionIds]);
  return active;
}

export default function HandbookClient({ handbook }: { handbook: Handbook }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionIds = handbook.sections?.map((s) => s.id) || [];
  const activeSection = useActiveSection(sectionIds);
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight text-gray-900">Digital handbok</span>
          </div>
          {/* Mobil menyknapp */}
          <button className="md:hidden ml-2 p-2 rounded hover:bg-gray-100 text-gray-700" onClick={() => setSidebarOpen(true)} aria-label="Öppna meny">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>
      <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="hidden md:block md:w-56 border-r border-gray-100 py-10 pr-6 mr-6">
          <nav className="space-y-1">
            <h2 className="font-semibold text-gray-700 mb-4 text-base tracking-tight uppercase">Innehåll</h2>
            {handbook.sections?.map((section) => (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className={`block px-0 py-1 border-l-2 transition font-medium text-base mb-1
                  ${activeSection === section.id ? 'border-blue-600 text-blue-700 font-semibold bg-transparent' : 'border-transparent text-gray-700 hover:text-blue-600'}`}
                style={{ fontWeight: activeSection === section.id ? 600 : 500 }}
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
                {handbook.sections?.map((section) => (
                  <a
                    key={section.id}
                    href={`#section-${section.id}`}
                    className={`block px-0 py-1 border-l-2 transition font-medium text-base mb-1
                      ${activeSection === section.id ? 'border-blue-600 text-blue-700 font-semibold bg-transparent' : 'border-transparent text-gray-700 hover:text-blue-600'}`}
                    style={{ fontWeight: activeSection === section.id ? 600 : 500 }}
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
        <main className="flex-1 py-12 px-4 md:px-0 bg-white min-h-[80vh] flex justify-center">
          <div className="w-full max-w-2xl">
            <h1 className="text-4xl font-bold text-gray-900 mb-10 tracking-tight leading-tight">{handbook.name}</h1>
            {handbook.sections?.map((section) => (
              <section key={section.id} id={`section-${section.id}`} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2 tracking-tight leading-tight">{section.title}</h2>
                <p className="text-gray-500 mb-8 text-base max-w-2xl leading-relaxed">{section.description}</p>
                <div className="space-y-12">
                  {section.pages?.map((page) => (
                    <div key={page.id} className="space-y-3">
                      <h3 className="text-xl font-semibold text-gray-800 mb-1 tracking-tight leading-tight">{page.title}</h3>
                      <div className="prose prose-lg max-w-none">
                        <ReactMarkdown>{page.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
      <footer className="bg-white border-t border-gray-100 mt-12 p-6 text-center text-gray-400 text-sm">
        Powered by <span className="font-medium text-gray-900">Handbok.org</span>
      </footer>
    </div>
  );
} 