import { redirect } from 'next/navigation';
import { getHandbookBySlug } from '@/lib/handbook-service';
import { DynamicManifest } from '@/components/DynamicManifest';
import MembersPageClient from './MembersPageClient';

interface MembersPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function MembersPage({ params, searchParams }: MembersPageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;

  // Get handbook data
  const handbookData = await getHandbookBySlug(slug);
  if (!handbookData) {
    redirect('/404');
  }

  return (
    <>
      <DynamicManifest handbookSlug={slug} />
      <MembersPageClient 
        handbookData={handbookData}
        handbookSlug={slug}
        searchParams={searchParamsResolved}
      />
    </>
  );
} 