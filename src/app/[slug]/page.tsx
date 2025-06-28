import { getHandbookBySlug } from '@/lib/handbook-service';
import React from 'react';
import { ModernHandbookClient } from '@/components/ModernHandbookClient';
import { notFound } from 'next/navigation';
import { Handbook } from '@/types/handbook';

// Se till att denna sida renderas dynamiskt för att hantera subdomäner korrekt
export const dynamic = 'force-dynamic';

interface HandbookPageProps {
  params: Promise<{ slug: string }>;
}

export default async function HandbookPage({ params }: HandbookPageProps) {
  const { slug } = await params;

  console.log('🎯 [HandbookPage] Loading handbook for slug:', slug);

  try {
    const handbookData = await getHandbookBySlug(slug);

    if (!handbookData) {
      console.log('❌ [HandbookPage] No handbook found for slug:', slug);
      console.log('🔍 [HandbookPage] This will trigger a 404 page');
      console.log('💡 [HandbookPage] Check if handbook exists with this slug in database');
      console.log('💡 [HandbookPage] Check if handbook is published (only published handbooks are returned)');
      notFound();
    }

    console.log('✅ [HandbookPage] Handbook loaded successfully:', {
      id: handbookData.id,
      title: handbookData.title,
      slug: handbookData.slug,
      sectionsCount: handbookData.sections?.length || 0,
      published: handbookData.published
    });

    // Validate data structure before adaptation
    if (!handbookData.id || !handbookData.title) {
      console.error('❌ [HandbookPage] Invalid handbook data structure:', {
        hasId: !!handbookData.id,
        hasTitle: !!handbookData.title,
        data: handbookData
      });
      notFound();
    }

    // Adapt data structure for client component
    const adaptedData = {
      id: handbookData.id,
      title: handbookData.title || '',
      subtitle: handbookData.subtitle || '',
      handbookSlug: handbookData.subdomain || handbookData.slug, // Use subdomain for slug, fallback to slug
      forum_enabled: handbookData.forum_enabled || false,
      sections: handbookData.sections || [],
      theme: handbookData.theme || {
        primary_color: '#3498db',
        secondary_color: '#2c3e50',
        logo_url: null
      }
    };

    console.log('🔧 [HandbookPage] Adapted data for client:', {
      id: adaptedData.id,
      title: adaptedData.title,
      handbookSlug: adaptedData.handbookSlug,
      sectionsCount: adaptedData.sections.length
    });

    console.log('🚀 [HandbookPage] About to render ModernHandbookClient...');
    return <ModernHandbookClient initialData={adaptedData} />;
  } catch (error) {
    console.error('💥 [HandbookPage] Error loading handbook:', error);
    console.error('💥 [HandbookPage] Error stack:', error.stack);
    console.error('💥 [HandbookPage] Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause,
      slug: slug
    });
    
    // Log additional debugging info
    console.error('🔍 [HandbookPage] Debugging info:');
    console.error('  - Requested slug:', slug);
    console.error('  - Error type:', typeof error);
    console.error('  - Error constructor:', error.constructor.name);
    
    // Check if it's a specific type of error that shouldn't trigger 404
    if (error.message?.includes('NEXT_HTTP_ERROR_FALLBACK')) {
      console.error('🚨 [HandbookPage] Next.js HTTP error detected - this might be a server/network issue, not a missing handbook');
    }
    
    notFound();
  }
} 