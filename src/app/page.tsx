import { headers } from 'next/headers';
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Menu, X } from 'lucide-react';
import HomeHandbookClient from './HomeHandbookClient';

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
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] px-2">
      <main className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-10 flex flex-col gap-8 items-center">
        <div className="w-full text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Välkommen till Handbok.org</h1>
          <p className="text-lg text-gray-600 mb-8">Den digitala plattformen för bostadsrättsföreningar att skapa och dela handböcker.</p>
        </div>
        <a href="/create-handbook" className="w-full block text-center bg-blue-600 hover:bg-blue-700 !text-white opacity-100 text-lg font-semibold rounded-full py-4 transition mb-2 shadow-sm">Skapa ny handbok</a>
        <AutoSuggestHandbookSearch />
      </main>
    </div>
  );
}

function AutoSuggestHandbookSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{id:string;name:string;subdomain:string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/search-handbooks?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
          setResults(data.results || []);
          setShowDropdown(true);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (subdomain: string) => {
    window.location.href = `/view?company=${encodeURIComponent(subdomain)}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      handleSelect(results[selectedIndex].subdomain);
    }
  };

  return (
    <div className="w-full relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setSelectedIndex(-1); }}
        onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Sök efter förening eller subdomän..."
        className="flex-1 px-4 py-3 rounded-full border border-gray-200 bg-[#f7f8fa] text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-full"
        autoComplete="off"
        aria-label="Sök förening"
      />
      {showDropdown && results.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl mt-2 shadow-lg z-10 max-h-60 overflow-auto">
          {results.map((r, i) => (
            <li
              key={r.id}
              className={`px-4 py-3 cursor-pointer hover:bg-blue-50 ${i === selectedIndex ? 'bg-blue-100' : ''}`}
              onMouseDown={() => handleSelect(r.subdomain)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="font-medium">{r.name}</span>
              <span className="ml-2 text-xs text-gray-500">({r.subdomain}.handbok.org)</span>
            </li>
          ))}
        </ul>
      )}
      {loading && <div className="absolute right-4 top-3 text-gray-400 animate-spin">⏳</div>}
    </div>
  );
}
