"use client";
import React, { useState, useRef, useEffect } from "react";
import { BookOpenIcon, SearchIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

interface HandbookResult {
  id: string;
  title: string;
  subdomain: string;
}

interface AutoSuggestHandbookSearchProps {
  hideHeader?: boolean;
}

export default function AutoSuggestHandbookSearch({ hideHeader = false }: AutoSuggestHandbookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HandbookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      setOpen(false);
      return;
    }
    
    console.log('[Search] Starting search for:', query);
    setLoading(true);
    setError(null);
    
    const timeout = setTimeout(() => {
      const encodedQuery = encodeURIComponent(query);
      console.log('[Search] Making API call to:', `/api/search-handbooks?q=${encodedQuery}`);
      
      fetch(`/api/search-handbooks?q=${encodedQuery}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(res => {
          console.log('[Search] API response status:', res.status);
          if (!res.ok) {
            throw new Error(`Sökningen misslyckades: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('[Search] API response data:', data);
          if (data.error) {
            console.log('[Search] API returned error:', data.error);
            setError(data.error);
            setResults([]);
          } else {
            const foundResults = data.results || [];
            console.log('[Search] Setting results:', foundResults);
            console.log('[Search] Results length:', foundResults.length);
            setResults(foundResults);
            setOpen(true);
            console.log('[Search] Set open to true');
          }
        })
        .catch(err => {
          console.error('[Search] Fetch error:', err);
          setError('Kunde inte utföra sökningen. Försök igen senare.');
          setResults([]);
        })
        .finally(() => {
          console.log('[Search] Setting loading to false');
          setLoading(false);
        });
    }, 250);
    
    return () => clearTimeout(timeout);
  }, [query]);

  // Hantera klick utanför
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (subdomain: string) => {
    // Navigera direkt till subdomän-baserad URL struktur
    window.location.href = `/${subdomain}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleInputFocus = () => {
    if (query.length >= 2 && results.length > 0) {
      setOpen(true);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto" ref={searchRef}>
      <div className="relative">
        <div className="rounded-xl overflow-hidden border-0 shadow-md bg-white">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="Sök efter förening..."
              className="w-full h-11 pl-12 pr-12 py-3 text-base bg-transparent border-0 outline-none focus:ring-0 placeholder:text-gray-400"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
              </div>
            )}
          </div>
          
          {open && query.length >= 2 && (
            <div className="border-t border-gray-100 max-h-96 overflow-y-auto">
              {results.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Föreningar
                  </div>
                  {results.map((handbook) => (
                    <button
                      key={handbook.id}
                      onClick={() => handleSelect(handbook.subdomain)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                        <BookOpenIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-gray-900 truncate">{handbook.title}</span>
                        <span className="text-xs text-gray-500 truncate">
                          {process.env.NODE_ENV === 'development' 
                            ? `localhost:3000/${handbook.subdomain}`
                            : `handbok.org/${handbook.subdomain}`
                          }
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8">
                  {error ? (
                    <div className="flex flex-col items-center">
                      <div className="bg-red-50 p-2 rounded-full mb-2">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                      </div>
                      <span className="text-gray-600 text-sm">{error}</span>
                    </div>
                  ) : (
                    query.length >= 2 && !loading && (
                      <div className="flex flex-col items-center">
                        <div className="bg-gray-100 p-2 rounded-full mb-2">
                          <AlertCircle className="h-6 w-6 text-gray-400" />
                        </div>
                        <span className="text-gray-600 text-sm">Ingen förening hittades</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 