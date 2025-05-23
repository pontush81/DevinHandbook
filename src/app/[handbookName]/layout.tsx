import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export default function HandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Handbok - Bostadsrättsförening',
    description: 'Digital handbok för bostadsrättsförening',
  };
} 