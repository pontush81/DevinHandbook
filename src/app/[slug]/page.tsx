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

  // console.log('🎯 [HandbookPage] Loading handbook for slug:', slug);

  try {
    const handbookData = await getHandbookBySlug(slug);

    if (!handbookData) {
      console.log('❌ [HandbookPage] No handbook found for slug:', slug);
      notFound();
    }

    // console.log('✅ [HandbookPage] Handbook loaded successfully:', {
    //   id: handbookData.id,
    //   title: handbookData.title,
    //   slug: handbookData.slug,
    //   sectionsCount: handbookData.sections?.length || 0
    // });

    // Adapt data structure for client component
    const adaptedData = {
      id: handbookData.id,
      title: handbookData.title || '',
      subtitle: handbookData.subtitle || '',
      handbookSlug: handbookData.subdomain, // Use subdomain for slug
      forum_enabled: handbookData.forum_enabled || false,
      sections: handbookData.sections || [],
      theme: handbookData.theme || {
        primary_color: '#3498db',
        secondary_color: '#2c3e50',
        logo_url: null
      }
    };

    return <ModernHandbookClient initialData={adaptedData} />;
  } catch (error) {
    console.error('💥 [HandbookPage] Error loading handbook:', error);
    notFound();
  }
} 