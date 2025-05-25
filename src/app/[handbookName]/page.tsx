"use client";
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React, { useEffect, useState } from 'react';
import { SessionTransferHandler } from '@/components/SessionTransferHandler';
import { ModernHandbookClient } from '@/components/ModernHandbookClient';
import { AuthProvider } from '@/contexts/AuthContext';

interface Section {
  id: string;
  title: string;
  description: string;
  order_index: number;
  handbook_id: string;
  completion_status?: number;
  is_active?: boolean;
  updated_at?: string;
  pages: Page[];
}

interface Page {
  id: string;
  title: string;
  content: string;
  order_index: number;
  section_id: string;
  table_of_contents?: boolean;
  updated_at?: string;
}

interface Handbook {
  id: string;
  title: string;
  subtitle?: string;
  version?: string;
  organization_name?: string;
  organization_address?: string;
  organization_org_number?: string;
  organization_phone?: string;
  organization_email?: string;
  updated_at?: string;
  subdomain: string;
  sections: Section[];
}

// Interface för ModernHandbookClient
interface ModernHandbookData {
  id: string;
  title: string;
  subtitle?: string;
  sections: {
    id: string;
    title: string;
    pages: {
      id: string;
      title: string;
      content: string;
      lastUpdated?: string;
      estimatedReadTime?: number;
    }[];
  }[];
}

// Se till att denna sida renderas dynamiskt för att hantera handböcker korrekt
export const dynamic = 'force-dynamic';

type PageParams = {
  handbookName: string;
};

type Props = {
  params: Promise<PageParams>;
};

export default function HandbookPage({ params }: Props) {
  const [handbook, setHandbook] = useState<Handbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handbookName, setHandbookName] = useState<string>('');

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    
    const loadHandbook = async () => {
      try {
        const resolvedParams = await params;
        const { handbookName: handbookNameParam } = resolvedParams;
        
        if (!isMounted) return; // Exit if component is unmounted
        
        console.log(`[Handbook Page] 🏁 RENDERING HANDBOOK PAGE FOR PATH: /${handbookNameParam}`);
        console.log(`[Handbook Page] 📍 This is path-based routing (handbok.org/${handbookNameParam})`);
        
        setHandbookName(handbookNameParam);
        
        // Använd handbookName som subdomain för att hitta handboken
        const handbookData = await getHandbookBySubdomain(handbookNameParam);
        console.log(`[Handbook Page] ✅ HANDBOOK FOUND:`, handbookData ? `ID: ${handbookData.id}, Title: ${handbookData.title}` : 'NULL');
        
        if (!isMounted) return; // Exit if component is unmounted
        
        if (handbookData) {
          setHandbook(handbookData);
        } else {
          setError(`Handboken "${handbookNameParam}" kunde inte hittas.`);
        }
      } catch (err) {
        console.error('Error fetching handbook:', err);
        if (isMounted) {
          setError('Det gick inte att ladda handboken just nu. Försök igen senare.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHandbook();
    
    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Convert handbook data to format expected by ModernHandbookClient
  const adaptHandbookData = (handbook: Handbook): ModernHandbookData => {
    console.log('[HandbookPage] Input handbook for adaptation:', handbook);
    
    if (!handbook) {
      console.error('[HandbookPage] Handbook is null/undefined');
      return null as any;
    }

    if (!handbook.sections || !Array.isArray(handbook.sections)) {
      console.error('[HandbookPage] Handbook sections invalid:', handbook.sections);
      return null as any;
    }

    const adaptedData = {
      id: handbook.id,
      title: handbook.title,
      subtitle: handbook.subtitle,
      sections: handbook.sections.map(section => ({
        id: section.id,
        title: section.title,
        pages: section.pages.map(page => ({
          id: page.id,
          title: page.title,
          content: page.content,
          lastUpdated: page.updated_at ? new Date(page.updated_at).toLocaleDateString('sv-SE') : undefined,
          estimatedReadTime: Math.max(1, Math.ceil((page.content?.length || 0) / 1000)) // Rough estimate
        }))
      }))
    };

    console.log('[HandbookPage] Adapted handbook data for ModernHandbookClient:', adaptedData);
    console.log('[HandbookPage] Sections in adapted data:', adaptedData.sections.map(s => ({ id: s.id, title: s.title, pagesCount: s.pages.length })));
    return adaptedData;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  if (error || !handbook) {
    return (
      <div className="min-h-screen bg-white p-8">
        <h1 className="text-2xl font-bold">Handbook Not Found</h1>
        <p className="text-red-500">{error}</p>
        <p className="text-gray-500 mt-4">Handbook path: /{handbookName}</p>
        <p className="text-gray-400 text-sm mt-2">Ingen handbok med subdomain '{handbookName}' hittades i databasen.</p>
      </div>
    );
  }

  console.log('[HandbookPage] About to adapt handbook data:', handbook);
  
  // Use the modern HandbookClient
  const adaptedHandbook = adaptHandbookData(handbook);

  console.log('[HandbookPage] Final adapted data before passing to ModernHandbookClient:', adaptedHandbook);

  if (!adaptedHandbook) {
    return (
      <div className="min-h-screen bg-white p-8">
        <h1 className="text-2xl font-bold text-red-600">Fel vid databearbetning</h1>
        <p className="text-gray-600">Handbokdata kunde inte bearbetas korrekt.</p>
      </div>
    );
  }

  return (
    <>
      <AuthProvider>
        <SessionTransferHandler />
        {adaptedHandbook && adaptedHandbook.title ? (
          <ModernHandbookClient initialData={adaptedHandbook} />
        ) : (
          <div className="min-h-screen bg-white p-8 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Fel: Ogiltig handbokdata</h1>
              <p className="text-gray-600">Handbokdata saknar titel eller är ofullständig.</p>
              <p className="text-sm text-gray-400 mt-2">Debug: {JSON.stringify(adaptedHandbook, null, 2)}</p>
            </div>
          </div>
        )}
      </AuthProvider>
    </>
  );
} 