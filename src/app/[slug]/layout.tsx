import { AuthProvider } from "@/contexts/AuthContext";
import { getHandbookBySlug } from '@/lib/handbook-service';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface LayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params;
  const handbookData = await getHandbookBySlug(slug);
  
  if (!handbookData) {
    return {};
  }
  
  return {
    title: `${handbookData.title} - Digital Handbok`,
    description: `${handbookData.title} - Din digitala handbok, alltid tillgänglig offline`,
    applicationName: handbookData.title,
    appleWebApp: {
      capable: true,
      title: handbookData.title,
      statusBarStyle: 'default',
    },
    manifest: `/api/manifest?slug=${slug}`,
    openGraph: {
      title: `${handbookData.title} - Digital Handbok`,
      description: `${handbookData.title} - Din digitala handbok, alltid tillgänglig offline`,
      url: `https://handbok.org/${slug}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://handbok.org/${slug}`,
    },
  };
}

export default async function Layout({ children, params }: LayoutProps) {
  const { slug } = params;
  
  // Hämta handbok-data för att verifiera att handboken finns
  const handbookData = await getHandbookBySlug(slug);
  
  if (!handbookData) {
    notFound();
  }
  
  return <AuthProvider>{children}</AuthProvider>;
} 