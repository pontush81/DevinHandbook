"use client";
import { getHandbookBySlug } from '@/lib/handbook-service';
import React, { useEffect, useState } from 'react';
import { SessionTransferHandler } from '@/components/SessionTransferHandler';
import { ModernHandbookClient } from '@/components/ModernHandbookClient';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { BookOpenIcon, ArrowLeftIcon } from 'lucide-react';
import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';

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
  forum_enabled?: boolean;
  sections: Section[];
}

// Se till att denna sida renderas dynamiskt för att hantera subdomäner korrekt
export const dynamic = 'force-dynamic';

interface HandbookPageProps {
  params: { slug: string };
}

async function HandbookPage({ params }: HandbookPageProps) {
  const { slug } = params;

  console.log('🎯 [HandbookPage] Loading handbook for slug:', slug);

  try {
    const handbookData = await getHandbookBySlug(slug);

    if (!handbookData) {
      console.log('❌ [HandbookPage] No handbook found for slug:', slug);
      notFound();
    }

    console.log('✅ [HandbookPage] Handbook loaded successfully:', {
      id: handbookData.id,
      title: handbookData.title,
      slug: handbookData.slug,
      sectionsCount: handbookData.sections?.length || 0
    });

    // Adapt data structure for client component
    const adaptedData = {
      id: handbookData.id,
      title: handbookData.title || '',
      subtitle: handbookData.subtitle || '',
      handbookSlug: handbookData.slug, // Use the new slug field
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

export default HandbookPage; 