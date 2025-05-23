"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { smartRedirectWithPolling } from '@/lib/redirect-utils';

interface CreateHandbookFormProps {
  userId: string;
}

export function CreateHandbookForm({ userId }: CreateHandbookFormProps) {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState<boolean | null>(null);
  const router = useRouter();
  const checkSubdomainTimeout = useRef<NodeJS.Timeout | null>(null);

  // Konvertera handbokens namn till en lämplig subdomän
  const convertToSubdomain = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[åä]/g, 'a')
      .replace(/[ö]/g, 'o')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Auto-fylla subdomän när namnet ändras
  useEffect(() => {
    if (name) {
      const suggestedSubdomain = convertToSubdomain(name);
      setSubdomain(suggestedSubdomain);
    }
  }, [name]);

  // Kontrollera om subdomänen är tillgänglig
  useEffect(() => {
    const checkSubdomainAvailability = async (value: string) => {
      if (!value) {
        setIsSubdomainAvailable(null);
        return;
      }

      setIsCheckingSubdomain(true);
      try {
        const { data: existingHandbook, error } = await supabase
          .from('handbooks')
          .select('id')
          .eq('subdomain', value)
          .maybeSingle();

        if (error) {
          console.error('Error checking subdomain availability:', error);
          setIsSubdomainAvailable(null);
        } else {
          setIsSubdomainAvailable(!existingHandbook);
        }
      } catch (error) {
        console.error('Error checking subdomain:', error);
        setIsSubdomainAvailable(null);
      } finally {
        setIsCheckingSubdomain(false);
      }
    };

    // Avbryt tidigare timeout
    if (checkSubdomainTimeout.current) {
      clearTimeout(checkSubdomainTimeout.current);
    }

    // Skapa en ny timeout för att kontrollera subdomänen efter en kort fördröjning
    if (subdomain) {
      checkSubdomainTimeout.current = setTimeout(() => {
        checkSubdomainAvailability(subdomain);
      }, 500);
    } else {
      setIsSubdomainAvailable(null);
    }

    // Rensa timeout när komponenten avmonteras
    return () => {
      if (checkSubdomainTimeout.current) {
        clearTimeout(checkSubdomainTimeout.current);
      }
    };
  }, [subdomain]);

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove disallowed characters and convert to lowercase
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-'); // Replace multiple hyphens with single hyphen
    setSubdomain(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Validate form fields
    if (!name.trim()) {
      setError('Vänligen ange ett namn för handboken');
      setIsLoading(false);
      return;
    }

    if (!subdomain.trim()) {
      setError('Vänligen ange en adress för handboken');
      setIsLoading(false);
      return;
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      setError('Adressen får endast innehålla små bokstäver, siffror och bindestreck');
      setIsLoading(false);
      return;
    }

    try {
      // Create the handbook directly - let the database enforce uniqueness
      // This eliminates race conditions between checking and creating
      const { data: handbook, error: handbookError } = await supabase
        .from('handbooks')
        .insert({
          title: name,
          subdomain,
          owner_id: userId,
          published: true
        })
        .select()
        .single();

      if (handbookError) {
        // Check if it's a uniqueness constraint violation
        if (handbookError.code === '23505' || handbookError.message?.includes('duplicate') || handbookError.message?.includes('subdomain')) {
          setError(`Adressen "${subdomain}.handbok.org" är redan upptagen. Vänligen välj en annan.`);
          setIsLoading(false);
          return;
        }
        throw handbookError;
      }
      
      // Lägg till skaparen som admin i handbook_permissions-tabellen
      const { error: permError } = await supabase
        .from('handbook_permissions')
        .insert({
          handbook_id: handbook.id,
          owner_id: userId,
          role: 'admin',
        });
        
      if (permError) {
        console.error('Error adding creator as admin:', permError);
      }

      // Create a welcome section
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .insert({
          title: 'Välkommen',
          description: 'Välkommen till föreningens digitala handbok! Här hittar du all viktig information om ditt boende och föreningen.',
          order_index: 0,
          handbook_id: handbook.id
        })
        .select()
        .single();

      if (sectionError) {
        console.error('Error creating section:', sectionError);
      }

      // Create a welcome page if section was created
      if (section) {
        const { error: pageError } = await supabase
          .from('pages')
          .insert({
            title: 'Om föreningen',
            content: `# Om vår förening\n\nHär finner du grundläggande information om vår bostadsrättsförening, inklusive historia, vision och kontaktuppgifter.\n\n## Fakta om föreningen\n\n- **Bildad år:** [Årtal]\n- **Antal lägenheter:** [Antal]\n- **Adress:** [Föreningens adress]\n- **Organisationsnummer:** [Org.nr]\n\nVår förening strävar efter att skapa en trivsam boendemiljö med god gemenskap och ekonomisk stabilitet. Vi uppmuntrar alla medlemmar att engagera sig i föreningens angelägenheter.`,
            order_index: 0,
            section_id: section.id,
            slug: 'om-foreningen'
          });

        if (pageError) {
          console.error('Error creating page:', pageError);
        }
        
        // Skapa en ytterligare sida för nya medlemmar
        const { error: secondPageError } = await supabase
          .from('pages')
          .insert({
            title: 'För nya medlemmar',
            content: `# Information för nya medlemmar\n\nDetta avsnitt innehåller praktisk information som är särskilt användbar för dig som är ny medlem i föreningen.\n\n## Viktigt att känna till\n\n- Styrelsen håller möten regelbundet och årsstämma hålls vanligtvis i [månad].\n- Felanmälan görs via [metod för felanmälan].\n- I denna handbok hittar du svar på många vanliga frågor om boendet.\n\n## Första tiden i föreningen\n\nVi rekommenderar att du bekantar dig med föreningens stadgar och trivselregler. Ta gärna kontakt med dina grannar och styrelsen om du har frågor om föreningen eller fastigheten.`,
            order_index: 1,
            section_id: section.id,
            slug: 'for-nya-medlemmar'
          });
          
        if (secondPageError) {
          console.error('Error creating second page:', secondPageError);
        }
      }

      setSuccess(`Handbok "${name}" skapades framgångsrikt! Du kommer att omdirigeras...`);
      
      console.log(`[Create Handbook] Success! Handbook created with ID: ${handbook.id}, subdomain: ${handbook.subdomain}`);
      console.log(`[Create Handbook] Starting smart redirect with userId: ${userId}`);
      
      // Use smart redirect with polling to ensure the new handbook is found
      setTimeout(() => {
        console.log(`[Create Handbook] Executing smart redirect...`);
        smartRedirectWithPolling(5, 800, userId);
      }, 2000);
    } catch (error) {
      console.error('Error creating handbook:', error);
      setError(`Ett fel uppstod: ${error.message || 'Okänt fel'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Handbokens namn
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="T.ex. Min förenings handbok"
            className="w-full"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-1">
            Adressen till din handbok blir:
          </label>
          <div className="flex items-center">
            <Input
              id="subdomain"
              type="text"
              value={subdomain}
              onChange={handleSubdomainChange}
              placeholder="min-forening"
              className={`w-full ${isSubdomainAvailable === true ? 'border-green-500' : isSubdomainAvailable === false ? 'border-red-500' : ''}`}
              disabled={isLoading}
            />
            <span className="ml-2 text-gray-500">.handbok.org</span>
          </div>
          
          <div className="mt-1">
            {isCheckingSubdomain ? (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 size={14} className="mr-1 animate-spin" />
                Kontrollerar tillgänglighet...
              </div>
            ) : isSubdomainAvailable === true ? (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle2 size={14} className="mr-1" />
                Denna adress verkar vara tillgänglig
              </div>
            ) : isSubdomainAvailable === false ? (
              <div className="flex items-center text-sm text-red-600">
                <AlertCircle size={14} className="mr-1" />
                Denna adress är upptagen. Vänligen välj en annan.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-md">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || isSubdomainAvailable === false}
      >
        {isLoading ? 'Skapar handbok...' : 'Skapa handbok'}
      </Button>
    </form>
  );
} 