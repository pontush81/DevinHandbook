"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';
import { redirectToNewlyCreatedHandbook } from '@/lib/redirect-utils';

interface CreateHandbookFormProps {
  userId: string;
}

export function CreateHandbookForm({ userId }: CreateHandbookFormProps) {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState<boolean | null>(null);
  const [creationStep, setCreationStep] = useState<'idle' | 'creating' | 'success' | 'redirecting'>('idle');

  // Keep track of timeout for debouncing subdomain checks
  let checkSubdomainTimeout: NodeJS.Timeout | null = null;

  // Log capture for debugging
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = function (...args: any[]) {
    logs.push(args.join(' '));
    originalLog.apply(console, args);
  };

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
    setCreationStep('creating');
    setError(null);
    setSuccess(null);

    // Validate form fields
    if (!name.trim()) {
      setError('Vänligen ange ett namn för handboken');
      setIsLoading(false);
      setCreationStep('idle');
      return;
    }

    if (!subdomain.trim()) {
      setError('Vänligen ange en adress för handboken');
      setIsLoading(false);
      setCreationStep('idle');
      return;
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      setError('Adressen får endast innehålla små bokstäver, siffror och bindestreck');
      setIsLoading(false);
      setCreationStep('idle');
      return;
    }

    try {
      console.log(`[Create Handbook] Creating handbook with rich template: ${name}, subdomain: ${subdomain}, userId: ${userId}`);
      
      // Use the rich template creation function
      const handbookId = await createHandbookWithSectionsAndPages(
        name,
        subdomain,
        completeBRFHandbook,
        userId
      );

      // Transition to success state
      setCreationStep('success');
      setIsLoading(false);
      setSuccess(`Handbok "${name}" skapades framgångsrikt! Du kommer att omdirigeras...`);
      
      console.log(`[Create Handbook] Success! Handbook created with ID: ${handbookId}, subdomain: ${subdomain}`);
      console.log(`[Create Handbook] About to schedule redirect to newly created handbook: ${subdomain}`);
      
      // Wait a moment to show success, then transition to redirecting state
      setTimeout(() => {
        setCreationStep('redirecting');
        setSuccess('Omdirigerar till din nya handbok...');
        setIsRedirecting(true);
      }, 1500);
      
      // Redirect after showing redirecting state briefly
      setTimeout(() => {
        console.log(`[Create Handbook] ⚡ EXECUTING REDIRECT NOW to newly created handbook: ${subdomain}`);
        console.log(`[Create Handbook] Current logs captured: ${logs.length} entries`);
        console.log(`[Create Handbook] Window location before redirect: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`);
        try {
          redirectToNewlyCreatedHandbook(subdomain);
          console.log(`[Create Handbook] ✅ Redirect function called successfully`);
        } catch (error) {
          console.error(`[Create Handbook] ❌ Error during redirect:`, error);
          setError(`Redirect misslyckades: ${error instanceof Error ? error.message : 'Okänt fel'}`);
          setCreationStep('idle');
          setIsLoading(false);
          setIsRedirecting(false);
        }
      }, 2500);
    } catch (error) {
      console.error('Error creating handbook:', error);
      
      // Check if it's a uniqueness constraint violation
      if (error.message?.includes('duplicate') || error.message?.includes('subdomain') || error.message?.includes('unique')) {
        setError(`Adressen "${subdomain}.handbok.org" är redan upptagen. Vänligen välj en annan.`);
      } else {
        setError(`Ett fel uppstod: ${error.message || 'Okänt fel'}`);
      }
      
      // Reset states on error
      setIsLoading(false);
      setCreationStep('idle');
      setIsRedirecting(false);
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
            <span className="text-gray-500 mr-1">www.handbok.org/handbook/</span>
            <Input
              id="subdomain"
              type="text"
              value={subdomain}
              onChange={handleSubdomainChange}
              placeholder="min-forening"
              className={`w-full ${isSubdomainAvailable === true ? 'border-green-500' : isSubdomainAvailable === false ? 'border-red-500' : ''}`}
              disabled={isLoading}
            />
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
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-md transition-all duration-300 ease-in-out">
          {creationStep === 'success' && (
            <CheckCircle2 size={16} className="animate-bounce" />
          )}
          {creationStep === 'redirecting' && (
            <Loader2 size={16} className="animate-spin" />
          )}
          <span>{success}</span>
        </div>
      )}

      {/* Creation progress indicator */}
      {creationStep !== 'idle' && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex items-center justify-between text-sm font-medium text-blue-900">
            <span>Skapar din handbok</span>
            <span>
              {creationStep === 'creating' && '1/3'}
              {creationStep === 'success' && '2/3'}
              {creationStep === 'redirecting' && '3/3'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${creationStep === 'creating' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className={creationStep === 'creating' ? 'text-blue-700' : 'text-green-700'}>
                Skapar handbok och sektioner
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                creationStep === 'creating' ? 'bg-gray-300' : 
                creationStep === 'success' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
              }`}></div>
              <span className={
                creationStep === 'creating' ? 'text-gray-500' :
                creationStep === 'success' ? 'text-blue-700' : 'text-green-700'
              }>
                Handboken är klar
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                creationStep === 'redirecting' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
              }`}></div>
              <span className={creationStep === 'redirecting' ? 'text-blue-700' : 'text-gray-500'}>
                Omdirigerar till din handbok
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Debug logs section */}
      {(error || logs.length > 0) && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            🔍 Debug Logs ({logs.length} entries) - Klicka för att visa
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-md max-h-60 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {`${index + 1}: ${log}`}
                </div>
              ))}
            </pre>
          </div>
        </details>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || isRedirecting || isSubdomainAvailable === false || creationStep !== 'idle'}
      >
        {creationStep === 'creating' && (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Skapar handbok...
          </span>
        )}
        {creationStep === 'success' && (
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            Handbok skapad!
          </span>
        )}
        {creationStep === 'redirecting' && (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Omdirigerar...
          </span>
        )}
        {creationStep === 'idle' && 'Skapa handbok'}
      </Button>
    </form>
  );
} 