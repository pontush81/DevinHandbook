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

    // Get handbook data
    const { data: handbookData, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, title, slug, forum_enabled')
      .eq('slug', slug)
      .single();

    if (handbookError || !handbookData) {
      console.error('Handbook not found:', handbookError);
      redirect('/dashboard');
    }

    // Check user role
    const userRole = await getUserRole(session.user.id, handbookData.id);
    
    // Everyone with access can view settings (admin functions will be hidden for non-admins)
    if (!userRole) {
      redirect(`/${slug}`);
    }

    return (
      <SettingsPageClient 
        handbookData={handbookData}
        handbookSlug={slug}
        userRole={userRole}
        userId={session.user.id}
      />
    );

  } catch (error) {
    console.error('Error in settings page:', error);
    redirect('/dashboard');
  }
} 