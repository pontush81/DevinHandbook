'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SettingsPageClient from './SettingsPageClient';
import { Loader2 } from 'lucide-react';

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

interface HandbookData {
  id: string;
  title: string;
  slug: string;
  forum_enabled: boolean;
  owner_id: string;
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [handbookData, setHandbookData] = useState<HandbookData | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, hasSession, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Get slug from params
  useEffect(() => {
    params.then(({ slug }) => setSlug(slug));
  }, [params]);

  // Handle authentication and data loading
  useEffect(() => {
    async function loadData() {
      if (authLoading || !slug) return;
      
      // Redirect to login if not authenticated
      if (!hasSession || !user) {
        router.replace('/login');
        return;
      }

      try {
        setIsLoading(true);
        
        // Get handbook data including owner_id
        const { data: handbookData, error: handbookError } = await supabase
          .from('handbooks')
          .select('id, title, slug, forum_enabled, owner_id')
          .eq('slug', slug)
          .single();

        if (handbookError || !handbookData) {
          console.error('Handbook not found:', handbookError);
          router.replace('/dashboard');
          return;
        }

        // Check if user is owner
        const isOwner = handbookData.owner_id === user.id;
        
        // Check if user has a role in handbook_members
        const { data: memberData, error: memberError } = await supabase
          .from('handbook_members')
          .select('role')
          .eq('handbook_id', handbookData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        const memberRole = memberData?.role || null;
        
        // User needs to be owner or have a role to access settings
        if (!isOwner && !memberRole) {
          router.replace(`/${slug}`);
          return;
        }

        // Determine effective role: owner gets admin, otherwise use membership role
        const effectiveRole = isOwner ? 'admin' : memberRole;

        setHandbookData(handbookData);
        setUserRole(effectiveRole);
        
      } catch (error) {
        console.error('Error loading settings data:', error);
        setError('Ett fel uppstod när inställningarna skulle laddas');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [authLoading, slug, hasSession, user, router]);

  // Show loading state
  if (authLoading || isLoading || !slug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Laddar inställningar...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:underline"
          >
            Tillbaka till dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render settings page
  if (handbookData && userRole && user) {
    return (
      <SettingsPageClient 
        handbookData={handbookData}
        handbookSlug={slug}
        userRole={userRole}
        userId={user.id}
      />
    );
  }

  return null;
} 