"use client";
import React, { useState, useRef, useEffect } from "react";
import { BookOpenIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';

interface HandbookResult {
  id: string;
  title: string;
  subdomain: string;
}

export default function AutoSuggestHandbookSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HandbookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      setLoading(false);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const timeout = setTimeout(() => {
      fetch(`/api/search-handbooks?q=${encodeURIComponent(query)}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Sökningen misslyckades: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('Sökresultat:', data);
          if (data.error) {
            setError(data.error);
            setResults([]);
          } else {
            setResults(data.results || []);
          }
          setShowDropdown(true);
        })
        .catch(err => {
          console.error('Fel vid sökning:', err);
          setError('Kunde inte utföra sökningen. Försök igen senare.');
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 250);
    
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (subdomain: string) => {
    window.location.href = `https://${subdomain}.handbok.org`;
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
    <div className="w-full relative overflow-hidden">
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setSelectedIndex(-1); }}
        onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Sök efter förening..."
        className="flex-1 px-4 py-3 rounded-full border border-gray-200 bg-[#f7f8fa] text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-full"
        autoComplete="off"
        aria-label="Sök förening"
      />
      {showDropdown && results.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white border border-gray-200 rounded-b-2xl rounded-t-none mt-0 shadow-2xl z-10 max-h-80 overflow-auto p-0">
          {results.map((r, i) => (
            <li
              key={r.id}
              className={`w-full block flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors select-none
                ${i === selectedIndex ? `bg-blue-100 text-blue-900 shadow ${i === 0 ? 'rounded-t-xl' : ''} ${i === results.length - 1 ? 'rounded-b-xl' : ''}` : 'hover:bg-blue-50'}`}
              onMouseDown={() => handleSelect(r.subdomain)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <BookOpenIcon className={`h-6 w-6 mt-1 flex-shrink-0 ${i === selectedIndex ? 'text-blue-600' : 'text-blue-500'}`} />
              <div className="flex flex-col w-full">
                <span className={`font-semibold text-base leading-tight ${i === selectedIndex ? 'text-blue-900' : 'text-gray-900'}`}>
                  {r.title}
                </span>
                <span className={`text-xs mt-1 ${i === selectedIndex ? 'text-blue-700' : 'text-gray-500'}`}>
                  {r.subdomain}.handbok.org
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {showDropdown && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-b-2xl rounded-t-none mt-0 shadow-2xl z-10 px-6 py-6 text-gray-500 text-center flex flex-col items-center gap-2">
          <ExclamationCircleIcon className="h-7 w-7 text-gray-300 mb-1" />
          <span>{error || "Ingen förening hittades"}</span>
        </div>
      )}
      {loading && (
        <div className="absolute right-4 top-3">
          <span className="inline-block w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
        </div>
      )}
    </div>
  );
} 