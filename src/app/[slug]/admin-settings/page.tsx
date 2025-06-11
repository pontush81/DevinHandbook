import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase-server';
import { getUserRole } from '@/lib/user-utils';
import AdminSettingsClient from './AdminSettingsClient';

interface AdminSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  const { slug } = await params;

  try {
    // Server-side auth check
    const supabaseServer = createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();

    if (!session?.user) {
      redirect('/login');
    }

    // Get handbook data
    const { data: handbookData, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, title, slug, forum_enabled, created_by')
      .eq('slug', slug)
      .single();

    if (handbookError || !handbookData) {
      console.error('Handbook not found:', handbookError);
      redirect('/dashboard');
    }

    // Check user role
    const userRole = await getUserRole(session.user.id, handbookData.id);
    
    // Only admins can access admin settings
    if (userRole !== 'admin') {
      redirect(`/${slug}`);
    }

    return (
      <AdminSettingsClient 
        handbookData={handbookData}
        handbookSlug={slug}
      />
    );

  } catch (error) {
    console.error('Error in admin settings page:', error);
    redirect('/dashboard');
  }
} 