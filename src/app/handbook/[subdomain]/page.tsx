"use client";
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React, { useEffect, useState } from 'react';
import { SessionTransferHandler } from '@/components/SessionTransferHandler';
import SupabaseHandbookApp from '@/components/SupabaseHandbookApp';

interface Section {
  id: string;
  title: string;
  description: string;
  order_index: number;
  handbook_id: string;
  pages: Page[];
}

interface Page {
  id: string;
  title: string;
  content: string;
  order_index: number;
  section_id: string;
}

interface Handbook {
  id: string;
  title: string;
  subdomain: string;
  sections: Section[];
}

// Se till att denna sida renderas dynamiskt för att hantera subdomäner korrekt
export const dynamic = 'force-dynamic';

type PageParams = {
  subdomain: string;
};

type Props = {
  params: Promise<PageParams>;
};

export default function HandbookPage({ params }: Props) {
  const [handbook, setHandbook] = useState<Handbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string>('');

  useEffect(() => {
    const loadHandbook = async () => {
      try {
        const resolvedParams = await params;
        const { subdomain: subdomainParam } = resolvedParams;
        
        console.log(`[Handbook Page] 🏁 RENDERING HANDBOOK PAGE FOR SUBDOMAIN: ${subdomainParam}`);
        console.log(`[Handbook Page] 📍 This proves the vercel.json rewrite is working correctly`);
        
        setSubdomain(subdomainParam);
        
        const handbookData = await getHandbookBySubdomain(subdomainParam);
        console.log(`[Handbook Page] ✅ HANDBOOK FOUND:`, handbookData ? `ID: ${handbookData.id}, Title: ${handbookData.title}` : 'NULL');
        
        if (handbookData) {
          setHandbook(handbookData);
        } else {
          setError(`Handboken "${subdomainParam}" kunde inte hittas.`);
        }
      } catch (err) {
        console.error('Error fetching handbook:', err);
        setError('Det gick inte att ladda handboken just nu. Försök igen senare.');
      } finally {
        setLoading(false);
      }
    };

    loadHandbook();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  if (error || !handbook) {
    return (
      <div className="min-h-screen bg-white p-8">
        <h1 className="text-2xl font-bold">Handbook Not Found</h1>
        <p className="text-red-500">{error}</p>
        <p className="text-gray-500 mt-4">Subdomain: {subdomain}</p>
      </div>
    );
  }

  return (
    <>
      <SessionTransferHandler />
      <SupabaseHandbookApp handbook={handbook} />
    </>
  );
} 