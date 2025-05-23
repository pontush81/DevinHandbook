"use client";
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React, { useEffect, useState } from 'react';
import { SessionTransferHandler } from '@/components/SessionTransferHandler';
import HandbookClient from '@/components/HandbookClient';

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

interface Handbook {
  id: string;
  title: string;
  subdomain: string;
  sections: Section[];
}

// Interface för HandbookClient
interface HandbookClientData {
  id: string;
  name: string;
  sections: {
    id: string;
    title: string;
    description: string;
    pages: {
      id: string;
      title: string;
      content: string;
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

  // Convert handbook data to format expected by HandbookClient
  const adaptHandbookData = (handbook: Handbook): HandbookClientData => {
    return {
      id: handbook.id,
      name: handbook.title, // HandbookClient expects 'name' instead of 'title'
      sections: handbook.sections.map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        pages: section.pages.map(page => ({
          id: page.id,
          title: page.title,
          content: page.content
        }))
      }))
    };
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
      </div>
    );
  }

  // Use the beautiful HandbookClient
  const adaptedHandbook = adaptHandbookData(handbook);

  return (
    <>
      <SessionTransferHandler />
      <HandbookClient handbook={adaptedHandbook} />
    </>
  );
} 