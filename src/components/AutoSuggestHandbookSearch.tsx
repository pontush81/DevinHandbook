"use client";
import React, { useState, useRef, useEffect } from "react";
import { BookOpenIcon, SearchIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
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
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const commandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
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
            // Öppna Command automatiskt när vi får resultat
            if (foundResults.length > 0) {
              setOpen(true);
            }
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

  // Hantera klick utanför Command
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (subdomain: string) => {
    window.location.href = `https://${subdomain}.handbok.org`;
  };

  return (
    <div className="w-full max-w-xl mx-auto" ref={commandRef}>
      {hideHeader ? (
        <div className="relative">
          <Command className="rounded-xl overflow-hidden border border-gray-200 shadow-md bg-white">
            <div className="flex items-center border-b px-4 py-2">
              <SearchIcon className="mr-4 h-4 w-4 shrink-0 text-blue-500" />
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Sök efter förening..."
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-base outline-hidden placeholder:text-muted-foreground border-0 focus:ring-0"
              />
              {loading && (
                <div className="ml-3 shrink-0">
                  <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                </div>
              )}
            </div>
            {open && (query.length >= 2) && (
              <CommandList className="max-h-96 overflow-y-auto py-2">
                {results.length > 0 ? (
                  <CommandGroup heading="Föreningar">
                    {results.map((handbook) => (
                      <CommandItem
                        key={handbook.id}
                        onSelect={() => handleSelect(handbook.subdomain)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <div className="bg-blue-100 p-2 rounded-full">
                          <BookOpenIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{handbook.title}</span>
                          <span className="text-xs text-gray-500">{handbook.subdomain}.handbok.org</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : (
                  <CommandEmpty>
                    {error ? (
                      <div className="flex flex-col items-center py-8">
                        <div className="bg-red-50 p-2 rounded-full mb-2">
                          <AlertCircle className="h-6 w-6 text-red-400" />
                        </div>
                        <span className="text-gray-600">{error}</span>
                      </div>
                    ) : (
                      query.length >= 2 && !loading && (
                        <div className="flex flex-col items-center py-8">
                          <div className="bg-gray-100 p-2 rounded-full mb-2">
                            <AlertCircle className="h-6 w-6 text-gray-400" />
                          </div>
                          <span className="text-gray-600">Ingen förening hittades</span>
                        </div>
                      )
                    )}
                  </CommandEmpty>
                )}
              </CommandList>
            )}
          </Command>
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
              <Command className="rounded-xl overflow-hidden border-0 shadow-md bg-white">
                <div className="flex items-center border-b px-4 py-2">
                  <SearchIcon className="mr-4 h-4 w-4 shrink-0 text-blue-500" />
                  <CommandInput
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Sök efter förening..."
                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-base outline-hidden placeholder:text-muted-foreground border-0 focus:ring-0"
                  />
                  {loading && (
                    <div className="ml-3 shrink-0">
                      <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                    </div>
                  )}
                </div>
                {open && (query.length >= 2) && (
                  <CommandList className="max-h-96 overflow-y-auto py-2">
                    {results.length > 0 ? (
                      <CommandGroup heading="Föreningar">
                        {results.map((handbook) => (
                          <CommandItem
                            key={handbook.id}
                            onSelect={() => handleSelect(handbook.subdomain)}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors"
                          >
                            <div className="bg-blue-100 p-2 rounded-full">
                              <BookOpenIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{handbook.title}</span>
                              <span className="text-xs text-gray-500">{handbook.subdomain}.handbok.org</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : (
                      <CommandEmpty>
                        {error ? (
                          <div className="flex flex-col items-center py-8">
                            <div className="bg-red-50 p-2 rounded-full mb-2">
                              <AlertCircle className="h-6 w-6 text-red-400" />
                            </div>
                            <span className="text-gray-600">{error}</span>
                          </div>
                        ) : (
                          query.length >= 2 && !loading && (
                            <div className="flex flex-col items-center py-8">
                              <div className="bg-gray-100 p-2 rounded-full mb-2">
                                <AlertCircle className="h-6 w-6 text-gray-400" />
                              </div>
                              <span className="text-gray-600">Ingen förening hittades</span>
                            </div>
                          )
                        )}
                      </CommandEmpty>
                    )}
                  </CommandList>
                )}
              </Command>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 