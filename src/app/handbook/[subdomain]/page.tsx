"use client";
import { getHandbookBySubdomain } from '@/lib/handbook-service';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import HandbookSectionCard from '@/components/HandbookSectionCard';
import HandbookHeader from '@/components/HandbookHeader';
import HandbookOnboardingBanner from '@/components/HandbookOnboardingBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  handbook_id: string;
  pages: Page[];
}

interface Page {
  id: string;
  title: string;
  content: string;
  order: number;
  section_id: string;
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
        
        // Först försök via direkt supabase-anrop som fallback på subdomäner
        const { data: memberData, error: memberError } = await supabase
          .from('handbook_members')
          .select('role')
          .eq('handbook_id', handbookId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        console.log('[AdminButton] Resultat från direkt anrop:', { memberData, memberError });
        
        if (!memberError && memberData && memberData.role === 'admin') {
          setIsAdmin(true);
          setIsChecking(false);
          return;
        }
        
        // Försök via API endast om direktanropet inte fungerade
        const adminUrl = `${window.location.protocol}//${window.location.host.replace(/^[^.]+\./, '')}/api/check-admin-status?handbook_id=${handbookId}`;
        console.log('[AdminButton] Försöker API-anrop till:', adminUrl);
        
        const response = await fetch(adminUrl);
        const data = await response.json();
        
        console.log('[AdminButton] Svar från API:', data);
        
        if (response.ok) {
          setIsAdmin(data.isAdmin);
        } else {
          console.error('[AdminButton] API-fel:', data);
          setError(data.error || 'Fel vid kontroll av adminrättigheter');
        }
      } catch (error) {
        console.error('[AdminButton] Oväntat fel:', error);
        setError('Kunde inte kontrollera admin-status');
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
        onClick={() => window.location.href = `/admin?handbook=${handbookId}`}
      >
        <Settings className="h-4 w-4" />
        <span>Administrera (Admin)</span>
      </Button>
    );
  }

  // Vanlig logik
  if (isChecking) return <div className="text-xs text-gray-400 animate-pulse">Kontrollerar behörighet...</div>;
  if (error) return <div className="text-xs text-red-400">{error}</div>;
  if (!isAdmin) return null;

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-1" 
      onClick={() => window.location.href = `/admin?handbook=${handbookId}`}
    >
      <Settings className="h-4 w-4" />
      <span>Administrera</span>
    </Button>
  );
}

export default async function HandbookPage({ params }: Props) {
  // Försök hämta handbook, men med extra felhantering för att undvika redirects
  let handbook = null;
  try {
    handbook = await getHandbookBySubdomain(params.subdomain);
  } catch (error) {
    console.error('Error fetching handbook:', error);
    // Visa en fallback istället för notFound() för att undvika redirect
    return (
      <div className="min-h-screen bg-white p-8">
        <h1 className="text-2xl font-bold">Handbook Viewer</h1>
        <p className="text-red-500">
          Det gick inte att ladda handboken just nu. Försök igen senare.
        </p>
        <p className="text-gray-500 mt-4">Subdomain: {params.subdomain}</p>
      </div>
    );
  }
  
  // Om ingen handbook hittades, visa en felsida istället för notFound()
  if (!handbook) {
    return (
      <div className="min-h-screen bg-white p-8">
        <h1 className="text-2xl font-bold">Handbook Not Found</h1>
        <p>Handboken "{params.subdomain}" kunde inte hittas.</p>
      </div>
    );
  }
  
  // Inline redigering: endast för admin/editor
  function SectionEditor({ section }: { section: Section }) {
    const { user } = useAuth();
    const [editMode, setEditMode] = useState(false);
    const [title, setTitle] = useState(section.title);
    const [description, setDescription] = useState(section.description);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canEdit = user?.role === 'admin' || user?.role === 'editor';

    const handleSave = async () => {
      setSaving(true);
      setError(null);
      const { error } = await supabase
        .from('sections')
        .update({ title, description })
        .eq('id', section.id);
      setSaving(false);
      if (error) setError('Kunde inte spara ändringar.');
      else setEditMode(false);
    };

    if (!canEdit) return <HandbookSectionCard title={section.title} description={section.description} />;
    if (!editMode) {
      return (
        <div className="flex items-center gap-2">
          <HandbookSectionCard title={section.title} description={section.description} />
          <button className="text-blue-600 underline text-sm" onClick={() => setEditMode(true)}>Redigera</button>
        </div>
      );
    }
    return (
      <div className="bg-white border rounded-lg p-4 mb-2">
        <input
          className="block w-full mb-2 border px-2 py-1 rounded"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <input
          className="block w-full mb-2 border px-2 py-1 rounded"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleSave} disabled={saving}>{saving ? 'Sparar...' : 'Spara'}</button>
          <button className="text-gray-600 underline" onClick={() => setEditMode(false)}>Avbryt</button>
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>
    );
  }

  function PageEditor({ page }: { page: Page }) {
    const { user } = useAuth();
    const [editMode, setEditMode] = useState(false);
    const [title, setTitle] = useState(page.title);
    const [content, setContent] = useState(page.content);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canEdit = user?.role === 'admin' || user?.role === 'editor';

    const handleSave = async () => {
      setSaving(true);
      setError(null);
      const { error } = await supabase
        .from('pages')
        .update({ title, content })
        .eq('id', page.id);
      setSaving(false);
      if (error) setError('Kunde inte spara ändringar.');
      else setEditMode(false);
    };

    if (!canEdit) return (
      <div>
        <h3 className="text-xl font-medium">{page.title}</h3>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['html']} skipHtml>
            {page.content}
          </ReactMarkdown>
        </div>
      </div>
    );
    if (!editMode) {
      return (
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-medium">{page.title}</h3>
            <button className="text-blue-600 underline text-sm" onClick={() => setEditMode(true)}>Redigera</button>
          </div>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['html']} skipHtml>
              {page.content}
            </ReactMarkdown>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white border rounded-lg p-4 mb-2">
        <input
          className="block w-full mb-2 border px-2 py-1 rounded"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          className="block w-full mb-2 border px-2 py-1 rounded font-mono"
          rows={8}
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleSave} disabled={saving}>{saving ? 'Sparar...' : 'Spara'}</button>
          <button className="text-gray-600 underline" onClick={() => setEditMode(false)}>Avbryt</button>
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>
    );
  }

  return (
    <MainLayout variant="app" showAuth={false} sections={handbook.sections.map((s: Section) => ({ id: s.id, title: s.title }))}>
      <HandbookOnboardingBanner />
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{handbook.title}</h1>
            <p className="text-gray-500">Digital handbok</p>
          </div>
          <div>
            {/* Använd nya AdminButton-komponenten istället för direkt knapp */}
            <AdminButton handbookId={handbook.id} />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-1 sticky top-8">
              <h2 className="font-medium mb-4">Innehåll</h2>
              {(handbook.sections || []).map((section: Section) => (
                <a
                  key={section.id}
                  href={`#section-${section.id}`}
                  className="block p-2 text-sm hover:bg-gray-50 rounded"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
          {/* Content */}
          <div className="md:col-span-3 space-y-12">
            {(handbook.sections || []).map((section: Section) => (
              <section key={section.id} id={`section-${section.id}`} className="space-y-6">
                <SectionEditor section={section} />
                <div className="space-y-8">
                  {(section.pages || []).map((page: Page) => (
                    <PageEditor key={page.id} page={page} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </MainLayout>
  );
} 