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
  completion_status?: number;
  is_active?: boolean;
  is_public?: boolean;
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

// Interface för HandbookClient - uppdaterad för nya strukturen
interface HandbookClientData {
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
  sections: {
    id: string;
    title: string;
    description: string;
    order_index: number;
    is_active?: boolean;
    completion_status?: number;
    updated_at?: string;
    pages: {
      id: string;
      title: string;
      content: string;
      order_index: number;
      table_of_contents?: boolean;
      updated_at?: string;
    }[];
  }[];
}

// Se till att denna sida renderas dynamiskt för att hantera subdomäner korrekt
export const dynamic = 'force-dynamic';

type PageParams = {
  subdomain: string;
};

type Props = {
  params: Promise<PageParams>;
};

export default function HandbookPage({ params }: Props) {
  const [handbook, setHandbook] = useState<Handbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string>('');

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    
    const loadHandbook = async () => {
      try {
        const resolvedParams = await params;
        const { subdomain: subdomainParam } = resolvedParams;
        
        if (!isMounted) return; // Exit if component is unmounted
        
        console.log(`[Handbook Page] 🏁 RENDERING HANDBOOK PAGE FOR SUBDOMAIN: ${subdomainParam}`);
        console.log(`[Handbook Page] 📍 This proves the vercel.json rewrite is working correctly`);
        
        setSubdomain(subdomainParam);
        
        const handbookData = await getHandbookBySubdomain(subdomainParam);
        console.log(`[Handbook Page] ✅ HANDBOOK FOUND:`, handbookData ? `ID: ${handbookData.id}, Title: ${handbookData.title}` : 'NULL');
        
        if (!isMounted) return; // Exit if component is unmounted
        
        if (handbookData) {
          setHandbook(handbookData);
        } else {
          setError(`Handboken "${subdomainParam}" kunde inte hittas.`);
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
    // Filter sections based on public status for non-admin users
    // Note: For public handbook pages, we always filter to only show public sections
    const visibleSections = handbook.sections.filter(section => section.is_public !== false);

    return {
      id: handbook.id,
      title: handbook.title,
      subtitle: handbook.subtitle,
      version: handbook.version,
      organization_name: handbook.organization_name,
      organization_address: handbook.organization_address,
      organization_org_number: handbook.organization_org_number,
      organization_phone: handbook.organization_phone,
      organization_email: handbook.organization_email,
      updated_at: handbook.updated_at,
      sections: visibleSections.map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order_index: section.order_index,
        is_active: section.is_active,
        completion_status: section.completion_status,
        updated_at: section.updated_at,
        pages: section.pages.map(page => ({
          id: page.id,
          title: page.title,
          content: page.content,
          order_index: page.order_index,
          table_of_contents: page.table_of_contents,
          updated_at: page.updated_at
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
        <p className="text-gray-500 mt-4">Subdomain: {subdomain}</p>
      </div>
    );
  }

  // Use the beautiful HandbookClient instead of basic SupabaseHandbookApp
  const adaptedHandbook = adaptHandbookData(handbook);

  return (
    <>
      <SessionTransferHandler />
      <HandbookClient handbook={adaptedHandbook} />
    </>
  );
} 