import { getHandbookBySlug } from '@/lib/handbook-service';
import { MessagesPageClient } from './MessagesPageClient';
import { notFound } from 'next/navigation';

interface MessagesPageProps {
  params: { slug: string };
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { slug } = params;

  console.log('🎯 [MessagesPage] Loading handbook for slug:', slug);

  const handbookData = await getHandbookBySlug(slug);

  if (!handbookData) {
    console.log('❌ [MessagesPage] No handbook found for slug:', slug);
    notFound();
  }

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
    />
  );
} 