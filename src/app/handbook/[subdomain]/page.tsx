import { getHandbookBySubdomain } from '@/lib/handbook-service';
import { notFound } from 'next/navigation';
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  handbook_id: string;
  pages: Page[];
}

interface Page {
  id: string;
  title: string;
  content: string;
  order: number;
  section_id: string;
}

export const revalidate = 180; // 3 minutes

export async function generateStaticParams() {
  return [];
}

export default async function HandbookPage({
  params,
}: {
  params: { subdomain: string };
}) {
  const handbook = await getHandbookBySubdomain(params.subdomain);
  
  if (!handbook) {
    notFound();
  }
  
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold">{handbook.name}</h1>
          <p className="text-gray-500">Digital handbok</p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-1 sticky top-8">
              <h2 className="font-medium mb-4">Innehåll</h2>
              {handbook.sections.map((section: Section) => (
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
            {handbook.sections.map((section: Section) => (
              <section key={section.id} id={`section-${section.id}`} className="space-y-6">
                <h2 className="text-2xl font-semibold">{section.title}</h2>
                <p className="text-gray-500">{section.description}</p>
                
                <div className="space-y-8">
                  {section.pages.map((page: Page) => (
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
          Powered by <a href="https://handbok.org" className="font-medium hover:text-gray-700">Handbok.org</a>
        </div>
      </footer>
    </div>
  );
}
