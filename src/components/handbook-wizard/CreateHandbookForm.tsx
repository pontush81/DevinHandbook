"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { defaultHandbookTemplate } from '@/lib/templates/handbook-template';
import { redirectToNewlyCreatedHandbook } from '@/lib/redirect-utils';

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

  // Keep track of timeout for debouncing subdomain checks
  let checkSubdomainTimeout: NodeJS.Timeout | null = null;

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
    if (checkSubdomainTimeout) {
      clearTimeout(checkSubdomainTimeout);
    }

    // Skapa en ny timeout för att kontrollera subdomänen efter en kort fördröjning
    if (subdomain) {
      checkSubdomainTimeout = setTimeout(() => {
        checkSubdomainAvailability(subdomain);
      }, 500);
    } else {
      setIsSubdomainAvailable(null);
    }

    // Rensa timeout när komponenten avmonteras
    return () => {
      if (checkSubdomainTimeout) {
        clearTimeout(checkSubdomainTimeout);
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
      console.log(`[Create Handbook] Creating handbook with rich template: ${name}, subdomain: ${subdomain}, userId: ${userId}`);
      
      // Use the rich template creation function
      const handbookId = await createHandbookWithSectionsAndPages(
        name,
        subdomain,
        defaultHandbookTemplate,
        userId
      );

      setSuccess(`Handbok "${name}" skapades framgångsrikt! Du kommer att omdirigeras...`);
      
      console.log(`[Create Handbook] Success! Handbook created with ID: ${handbookId}, subdomain: ${subdomain}`);
      console.log(`[Create Handbook] About to schedule redirect to newly created handbook: ${subdomain}`);
      
      // Redirect directly to the newly created handbook (regardless of user's total handbook count)
      setTimeout(() => {
        console.log(`[Create Handbook] ⚡ EXECUTING REDIRECT NOW to newly created handbook: ${subdomain}`);
        try {
          redirectToNewlyCreatedHandbook(subdomain);
          console.log(`[Create Handbook] ✅ Redirect function called successfully`);
        } catch (error) {
          console.error(`[Create Handbook] ❌ Error during redirect:`, error);
        }
      }, 1000); // Reduced from 2000 to 1000
    } catch (error) {
      console.error('Error creating handbook:', error);
      
      // Check if it's a uniqueness constraint violation
      if (error.message?.includes('duplicate') || error.message?.includes('subdomain') || error.message?.includes('unique')) {
        setError(`Adressen "${subdomain}.handbok.org" är redan upptagen. Vänligen välj en annan.`);
      } else {
        setError(`Ett fel uppstod: ${error.message || 'Okänt fel'}`);
      }
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