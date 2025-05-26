"use client";
import React, { useState, useRef, useEffect } from "react";
import { BookOpenIcon, SearchIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

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
    
    setLoading(true);
    setError(null);
    
    const timeout = setTimeout(() => {
      const encodedQuery = encodeURIComponent(query);
      
      fetch(`/api/search-handbooks?q=${encodedQuery}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Sökningen misslyckades: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.error) {
            setError(data.error);
            setResults([]);
          } else {
            const foundResults = data.results || [];
            setResults(foundResults);
            setOpen(true);
          }
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
    // Under utveckling, navigera till en testsida som visar vilken förening som valdes
    if (process.env.NODE_ENV === 'development') {
      window.location.href = `/test-search/${subdomain}`;
    } else {
      // I produktion, navigera till den riktiga externa domänen
      window.location.href = `https://${subdomain}.handbok.org`;
    }
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
      {hideHeader ? (
        <div className="relative">
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-md bg-white">
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
                          <span className="text-xs text-gray-500 truncate">{handbook.subdomain}.handbok.org</span>
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
      ) : (
        <Card className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="mb-4 text-center">
              <div className="flex justify-center items-center mb-2">
                <div className="bg-blue-50 p-3 rounded-full">
                  <SearchIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Hitta förening</h2>
              <p className="text-gray-600 text-sm">Sök efter din bostadsrättsförening och få tillgång till er handbok</p>
            </div>
            
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
                              <span className="text-xs text-gray-500 truncate">{handbook.subdomain}.handbok.org</span>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
} 