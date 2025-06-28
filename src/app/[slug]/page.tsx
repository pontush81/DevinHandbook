import { getHandbookBySlug } from '@/lib/handbook-service';
import React from 'react';
import { ModernHandbookClient } from '@/components/ModernHandbookClient';
import { notFound } from 'next/navigation';
import { Handbook } from '@/types/handbook';

// Se till att denna sida renderas dynamiskt för att hantera subdomäner korrekt
export const dynamic = 'force-dynamic';

interface HandbookPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HandbookPage({ params, searchParams }: HandbookPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  console.log('🎯 [HandbookPage] Loading handbook for slug:', slug);

  try {
    const handbookData = await getHandbookBySlug(slug);

    if (!handbookData) {
      console.log('❌ [HandbookPage] No handbook found for slug:', slug);
      console.log('🔍 [HandbookPage] This will trigger a 404 page');
      console.log('💡 [HandbookPage] Check if handbook exists with this slug in database');
      console.log('💡 [HandbookPage] Check if handbook is published (only published handbooks are returned)');
      
      // 🔧 Enhanced error handling for join scenarios
      console.log('🔧 [HandbookPage] Checking if this is a join scenario...');
      
      // For production debugging - log more info about the slug
      console.log('🔍 [HandbookPage] Slug details:', {
        slug,
        slugLength: slug?.length,
        slugType: typeof slug,
        isValidSlug: /^[a-zA-Z0-9-_]+$/.test(slug || '')
      });
      
      // Add delay before 404 to allow for database propagation after joins
      if (slug && slug.length > 0) {
        console.log('⏱️ [HandbookPage] Adding delay before 404 in case handbook is being created...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try one more time
        const retryData = await getHandbookBySlug(slug);
        if (retryData) {
          console.log('✅ [HandbookPage] Found handbook on retry!');
          return renderHandbook(retryData, slug, resolvedSearchParams);
        }
      }
      
      notFound();
    }

    console.log('✅ [HandbookPage] Handbook loaded successfully:', {
      id: handbookData.id,
      title: handbookData.title,
      slug: handbookData.slug,
      sectionsCount: handbookData.sections?.length || 0,
      published: handbookData.published
    });

    return renderHandbook(handbookData, slug, resolvedSearchParams);

  } catch (error) {
    console.error('💥 [HandbookPage] Error loading handbook:', error);
    console.log('🔍 [HandbookPage] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      slug,
      timestamp: new Date().toISOString()
    });
    
    // Don't immediately 404 on errors - might be temporary
    console.log('🔄 [HandbookPage] Attempting graceful recovery...');
    
    try {
      // Try a simpler query as fallback
      const fallbackData = await getHandbookBySlug(slug);
      if (fallbackData) {
        console.log('✅ [HandbookPage] Fallback query succeeded!');
        return renderHandbook(fallbackData, slug, resolvedSearchParams);
      }
    } catch (fallbackError) {
      console.error('💥 [HandbookPage] Fallback also failed:', fallbackError);
    }
    
    notFound();
  }
}

function renderHandbook(handbookData: any, slug: string, searchParams?: { [key: string]: string | string[] | undefined }) {
  // Validate data structure before adaptation
  if (!handbookData.id || !handbookData.title) {
    console.error('❌ [HandbookPage] Invalid handbook data structure:', {
      hasId: !!handbookData.id,
      hasTitle: !!handbookData.title,
      data: handbookData
    });
    notFound();
  }

  // Check if edit mode should be enabled
  const defaultEditMode = searchParams?.edit === 'true';

  // Adapt data structure for client component
  const adaptedData = {
    id: handbookData.id,
    title: handbookData.title || '',
    subtitle: handbookData.subtitle || '',
    handbookSlug: handbookData.slug, // Use slug field (subdomain field no longer exists)
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
    sectionsCount: adaptedData.sections.length,
    defaultEditMode
  });

  return <ModernHandbookClient initialData={adaptedData} defaultEditMode={defaultEditMode} />;
} 