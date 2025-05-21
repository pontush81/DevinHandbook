"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface CreateHandbookFormProps {
  userId: string;
}

export function CreateHandbookForm({ userId }: CreateHandbookFormProps) {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

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
      setError('Vänligen ange en subdomän för handboken');
      setIsLoading(false);
      return;
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      setError('Subdomänen får endast innehålla små bokstäver, siffror och bindestreck');
      setIsLoading(false);
      return;
    }

    try {
      // Check if the subdomain is already taken
      const { data: existingHandbook } = await supabase
        .from('handbooks')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle();

      if (existingHandbook) {
        setError(`Subdomänen "${subdomain}" är redan upptagen. Vänligen välj en annan.`);
        setIsLoading(false);
        return;
      }

      // Create the handbook
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
        throw handbookError;
      }

      // Create a welcome section
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .insert({
          title: 'Välkommen',
          description: 'Välkommen till din handbok',
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
            title: 'Välkommen',
            content: `# Välkommen till ${name}\n\nDetta är startsidan för din handbok. Du kan redigera innehållet genom att klicka på "Redigera" i menyn.`,
            order_index: 0,
            section_id: section.id,
            slug: 'valkommen'
          });

        if (pageError) {
          console.error('Error creating page:', pageError);
        }
      }

      setSuccess(`Handbok "${name}" skapades framgångsrikt! Du kommer att omdirigeras till din handbok...`);
      
      // Redirect to the handbook after a short delay
      setTimeout(() => {
        router.push(`https://${subdomain}.handbok.org`);
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
            Subdomän
          </label>
          <div className="flex items-center">
            <Input
              id="subdomain"
              type="text"
              value={subdomain}
              onChange={handleSubdomainChange}
              placeholder="min-forening"
              className="w-full"
              disabled={isLoading}
            />
            <span className="ml-2 text-gray-500">.handbok.org</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Detta blir adressen till din handbok, t.ex. min-forening.handbok.org
          </p>
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
        disabled={isLoading}
      >
        {isLoading ? 'Skapar handbok...' : 'Skapa handbok'}
      </Button>
    </form>
  );
} 