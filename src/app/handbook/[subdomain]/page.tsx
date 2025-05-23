"use client";
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  params: PageParams;
};

// Ny komponent för att hantera admin-knappsvisning
function AdminButton({ handbookId }: { handbookId: string }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !handbookId) {
        setIsAdmin(false);
        setIsChecking(false);
        console.log('[AdminButton] Ingen användare eller handbook_id', { user, handbookId });
        return;
      }

      try {
        console.log('[AdminButton] Kontrollerar admin-status för', { userId: user.id, handbookId });
        
        // Metod 1: Först försök via direkt supabase-anrop som fallback på subdomäner
        try {
          const { data: memberData, error: memberError } = await supabase
            .from('handbook_members')
            .select('role')
            .eq('handbook_id', handbookId)
            .eq('user_id', user.id)
            .maybeSingle();
          
          console.log('[AdminButton] Resultat från direkt anrop:', { memberData, memberError });
          
          if (!memberError && memberData && memberData.role === 'admin') {
            console.log('[AdminButton] Admin-status bekräftad via direkt anrop');
            setIsAdmin(true);
            setIsChecking(false);
            return;
          }
        } catch (err) {
          console.error('[AdminButton] Fel vid direkt anrop:', err);
          // Fortsätt till nästa metod
        }
        
        // Metod 2: Försök med absolut URL till huvud-domänen för att hantera cross-domain
        try {
          // Extrahera huvuddomänen (t.ex. handbok.org från subdomain.handbok.org)
          const hostParts = window.location.host.split('.');
          const mainDomain = hostParts.length >= 2 ? hostParts.slice(-2).join('.') : window.location.host;
          
          const apiUrl = `${window.location.protocol}//${mainDomain}/api/check-admin-status?handbook_id=${handbookId}`;
          console.log('[AdminButton] Försöker cross-domain API-anrop till:', apiUrl);
          
          const response = await fetch(apiUrl, {
            credentials: 'include', // Viktigt för att skicka med cookies
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('[AdminButton] Svar från cross-domain API:', data);
            
            if (data.isAdmin) {
              console.log('[AdminButton] Admin-status bekräftad via cross-domain API');
              setIsAdmin(true);
              setIsChecking(false);
              return;
            }
          } else {
            console.warn('[AdminButton] Cross-domain API-anrop misslyckades:', await response.text());
          }
        } catch (err) {
          console.error('[AdminButton] Fel vid cross-domain API-anrop:', err);
          // Fortsätt till nästa metod
        }
        
        // Metod 3: Fallback till standard URL (relativ path)
        try {
          const relativeUrl = `/api/check-admin-status?handbook_id=${handbookId}`;
          console.log('[AdminButton] Försöker relativ URL:', relativeUrl);
          
          const response = await fetch(relativeUrl, { 
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('[AdminButton] Svar från relativ URL:', data);
            setIsAdmin(data.isAdmin);
          } else {
            const errorText = await response.text();
            console.error('[AdminButton] API-fel med relativ URL:', errorText);
            throw new Error(`API-fel: ${response.status} ${errorText}`);
          }
        } catch (err) {
          console.error('[AdminButton] Fel vid relativ URL:', err);
          setError('Kunde inte verifiera admin-status');
        }
        
      } catch (error) {
        console.error('[AdminButton] Oväntat fel vid admin-kontroll:', error);
        setError('Ett oväntat fel inträffade vid admin-kontroll');
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminStatus();
  }, [user, handbookId]);

  // Speciell hantering för utvecklare och superadmin
  const isSystemAdmin = user?.email?.toLowerCase() === 'pontus.horberg@gmail.com' || 
                       user?.email?.toLowerCase() === 'admin@handbok.org';

  // I utvecklingsläge, visa alltid admin-knappen
  if (process.env.NODE_ENV === 'development') {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-1 bg-amber-50" 
        onClick={() => window.location.href = `/admin?handbook=${handbookId}`}
      >
        <Settings className="h-4 w-4" />
        <span>Administrera (Dev)</span>
      </Button>
    );
  }

  // Visa alltid för systemadministratören
  if (isSystemAdmin) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-1" 
        onClick={() => window.location.href = `${window.location.protocol}//${window.location.host.replace(/^[^.]+\./, '')}/admin?handbook=${handbookId}`}
      >
        <Settings className="h-4 w-4" />
        <span>Administrera (Admin)</span>
      </Button>
    );
  }

  // Vanlig logik
  if (isChecking) return <div className="text-xs text-gray-400 animate-pulse">Kontrollerar behörighet...</div>;
  if (error) return <div className="text-xs text-red-400 hover:underline cursor-help" title={error}>Problem med admin-verifiering</div>;
  if (!isAdmin) return null;

  // Notera: Vi använder huvuddomänen för admin-sidan, inte subdomänen
  const adminUrl = `${window.location.protocol}//${window.location.host.replace(/^[^.]+\./, '')}/admin?handbook=${handbookId}`;

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-1" 
      onClick={() => window.location.href = adminUrl}
    >
      <Settings className="h-4 w-4" />
      <span>Administrera</span>
    </Button>
  );
}

export default async function HandbookPage({ params }: Props) {
  // Await params för Next.js 15 kompatibilitet
  const { subdomain } = await params;
  
  console.log(`[Handbook Page] 🏁 RENDERING HANDBOOK PAGE FOR SUBDOMAIN: ${subdomain}`);
  console.log(`[Handbook Page] 📍 This proves the vercel.json rewrite is working correctly`);

  let handbook = null;
  try {
    handbook = await getHandbookBySubdomain(subdomain);
    console.log(`[Handbook Page] ✅ HANDBOOK FOUND:`, handbook ? `ID: ${handbook.id}, Title: ${handbook.title}` : 'NULL');
  } catch (error) {
    console.error('Error fetching handbook:', error);
    // Visa en fallback istället för notFound() för att undvika redirect
    return (
      <div className="min-h-screen bg-white p-8">
        <h1 className="text-2xl font-bold">Handbook Viewer</h1>
        <p className="text-red-500">
          Det gick inte att ladda handboken just nu. Försök igen senare.
        </p>
        <p className="text-gray-500 mt-4">Subdomain: {subdomain}</p>
      </div>
    );
  }
  
  // Om ingen handbook hittades, visa en felsida istället för notFound()
  if (!handbook) {
    return (
      <div className="min-h-screen bg-white p-8">
        <h1 className="text-2xl font-bold">Handbook Not Found</h1>
        <p>Handboken "{subdomain}" kunde inte hittas.</p>
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