import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React from 'react';
import { SessionTransferHandler } from '@/components/SessionTransferHandler';
import { ModernHandbookClient } from '@/components/ModernHandbookClient';
import { notFound } from 'next/navigation';
import { HandbookSection } from '@/types/handbook';

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

type PageParams = {
  handbookName: string;
};

type Props = {
  params: Promise<PageParams>;
};

// Convert handbook data to format expected by ModernHandbookClient
const adaptHandbookData = (handbook: Handbook) => {
  console.log('[HandbookPage] Input handbook for adaptation:', handbook);
  
  if (!handbook) {
    console.error('[HandbookPage] Handbook is null/undefined');
    return null;
  }

  if (!handbook.sections || !Array.isArray(handbook.sections)) {
    console.error('[HandbookPage] Handbook sections invalid:', handbook.sections);
    return null;
  }

  console.log('[HandbookPage] Raw sections from database:', handbook.sections.map(s => ({
    id: s.id,
    title: s.title,
    is_public: s.is_public,
    pagesCount: s.pages?.length || 0
  })));

  // Convert to format expected by ModernHandbookClient
  const adaptedHandbook = {
    id: handbook.id,
    title: handbook.title,
    subtitle: handbook.subtitle,
    sections: handbook.sections.map(section => ({
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

  console.log('[HandbookPage] Adapted handbook for ModernHandbookClient:', adaptedHandbook);
  return adaptedHandbook;
};

export default async function HandbookPage({ params }: Props) {
  const resolvedParams = await params;
  const { handbookName } = resolvedParams;
  
  console.log(`[Handbook Page] 🏁 RENDERING HANDBOOK PAGE FOR PATH: /${handbookName}`);
  console.log(`[Handbook Page] 📍 This is path-based routing (handbok.org/${handbookName})`);
  
  try {
    // Använd handbookName som subdomain för att hitta handboken
    const handbookData = await getHandbookBySubdomain(handbookName);
    console.log(`[Handbook Page] ✅ HANDBOOK FOUND:`, handbookData ? `ID: ${handbookData.id}, Title: ${handbookData.title}` : 'NULL');
    
    if (!handbookData) {
      // Use notFound() for proper 404 handling - this works on server side
      console.log(`[Handbook Page] 📍 Handbook "${handbookName}" not found, calling notFound()`);
      notFound();
    }

    // Use ModernHandbookClient for inline editing functionality
    const adaptedHandbook = adaptHandbookData(handbookData);

    if (!adaptedHandbook) {
      console.error('[HandbookPage] Failed to adapt handbook data');
      notFound();
    }

    return (
      <>
        <SessionTransferHandler />
        <ModernHandbookClient 
          initialData={adaptedHandbook}
          defaultEditMode={false}
        />
      </>
    );
  } catch (err) {
    console.error('Error fetching handbook:', err);
    // For unexpected errors, throw to trigger 500 error page
    throw new Error(`Failed to load handbook: ${err}`);
  }
} 