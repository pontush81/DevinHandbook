import { getHandbookBySlug } from '@/lib/handbook-service';
import { MessagesPageClient } from './MessagesPageClient';
import { notFound } from 'next/navigation';
import { getNavigationContext, getDefaultBackLink } from '@/lib/navigation-utils';

interface MessagesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function MessagesPage({ params, searchParams }: MessagesPageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;

  console.log('🎯 [MessagesPage] Loading handbook for slug:', slug);

  const handbookData = await getHandbookBySlug(slug);

  if (!handbookData) {
    console.log('❌ [MessagesPage] No handbook found for slug:', slug);
    notFound();
  }

  // Get navigation context
  const urlSearchParams = new URLSearchParams(searchParamsResolved);
  const navigationContext = getNavigationContext(urlSearchParams, slug);
  const defaultBackLink = getDefaultBackLink(slug, handbookData.title);

  console.log('✅ [MessagesPage] Handbook loaded:', {
    id: handbookData.id,
    title: handbookData.title,
    slug: handbookData.slug,
    forum_enabled: handbookData.forum_enabled
  });

  // Check if forum is enabled
  if (!handbookData.forum_enabled) {
    console.log('❌ [MessagesPage] Forum not enabled for handbook:', slug);
    notFound();
  }

  return (
    <MessagesPageClient 
      handbookId={handbookData.id}
      handbookTitle={handbookData.title}
      handbookSlug={handbookData.slug}
      theme={handbookData.theme}
      navigationContext={navigationContext}
      defaultBackLink={defaultBackLink}
    />
  );
} 