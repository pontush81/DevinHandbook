import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getServerSession, getUserRole } from '@/lib/auth-utils';
import SettingsPageClient from './SettingsPageClient';

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;

  try {
    // Server-side auth check
    const session = await getServerSession();

    if (!session?.user) {
      redirect('/login');
    }

    // Get handbook data including owner_id
    const { data: handbookData, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, title, slug, forum_enabled, owner_id')
      .eq('slug', slug)
      .single();

    if (handbookError || !handbookData) {
      console.error('Handbook not found:', handbookError);
      redirect('/dashboard');
    }

    // Check if user is owner or has a role in handbook_members
    const isOwner = handbookData.owner_id === session.user.id;
    const userRole = await getUserRole(session.user.id, handbookData.id);
    
    // User needs to be owner or have a role to access settings
    if (!isOwner && !userRole) {
      redirect(`/${slug}`);
    }

    // Determine effective role: owner gets admin, otherwise use membership role
    const effectiveRole = isOwner ? 'admin' : userRole;

    return (
      <SettingsPageClient 
        handbookData={handbookData}
        handbookSlug={slug}
        userRole={effectiveRole}
        userId={session.user.id}
      />
    );

  } catch (error) {
    console.error('Error in settings page:', error);
    redirect('/dashboard');
  }
} 