"use client";
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React, { useEffect, useState } from 'react';
import { SessionTransferHandler } from '@/components/SessionTransferHandler';
import { ModernHandbookClient } from '@/components/ModernHandbookClient';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { BookOpenIcon, ArrowLeftIcon } from 'lucide-react';

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

  // Convert handbook data to format expected by ModernHandbookClient
  const adaptHandbookData = (handbook: Handbook) => {
    // Filter sections based on public status for non-admin users
    // Note: For public handbook pages, we always filter to only show public sections
    const visibleSections = handbook.sections.filter(section => section.is_public !== false);

    return {
      id: handbook.id,
      title: handbook.title,
      subtitle: handbook.subtitle,
      sections: visibleSections.map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order_index: section.order_index,
        handbook_id: section.handbook_id,
        is_public: section.is_public,
        pages: section.pages.map(page => ({
          id: page.id,
          title: page.title,
          content: page.content,
          order_index: page.order_index,
          section_id: page.section_id,
          lastUpdated: page.updated_at ? new Date(page.updated_at).toLocaleDateString('sv-SE') : undefined,
          estimatedReadTime: Math.max(1, Math.ceil((page.content?.length || 0) / 1000))
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
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="flex justify-center items-center mb-6">
                <div className="bg-blue-100 p-4 rounded-full">
                  <BookOpenIcon className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Handbok vald!
              </h1>
              
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Du valde föreningen:
                </h2>
                <div className="bg-blue-50 rounded-lg p-6">
                  <p className="text-xl font-medium text-blue-800 mb-2">
                    {subdomain}
                  </p>
                  <p className="text-blue-600">
                    {subdomain}.handbok.org
                  </p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                <p className="text-yellow-800 text-sm">
                  <strong>Utvecklingsläge:</strong> I produktion skulle du nu navigeras till den riktiga handboken på {subdomain}.handbok.org
                </p>
              </div>
              
              <Link href="/">
                <Button className="inline-flex items-center gap-2">
                  <ArrowLeftIcon className="h-4 w-4" />
                  Tillbaka till startsidan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Use the beautiful HandbookClient instead of basic SupabaseHandbookApp
  const adaptedHandbook = adaptHandbookData(handbook);

  return (
    <>
      <SessionTransferHandler />
      <ModernHandbookClient 
        initialData={adaptedHandbook}
        defaultEditMode={false}
      />
    </>
  );
} 