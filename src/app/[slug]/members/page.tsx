import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MembersManager } from '@/components/handbook/MembersManager';
import { getHandbookBySlug } from '@/lib/handbook-service';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Database } from '@/types/supabase';

interface MembersPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { slug } = await params;

  // Get handbook data
  const handbookData = await getHandbookBySlug(slug);
  if (!handbookData) {
    redirect('/404');
  }

  // Check if user is authenticated and has admin permissions
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check if user is admin for this handbook
  const { data: memberData, error: memberError } = await supabase
    .from('handbook_members')
    .select('role')
    .eq('handbook_id', handbookData.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isAdmin = memberData?.role === 'admin';

  if (memberError || !memberData || !isAdmin) {
    redirect(`/${slug}`); // Redirect to handbook if not admin
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link href={`/${slug}`}>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Tillbaka till {handbookData.title}
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hantera medlemmar</h1>
              <p className="text-gray-600">Bjud in nya medlemmar och hantera befintliga för {handbookData.title}</p>
            </div>
          </div>
        </div>

        {/* Members Manager Component */}
        <MembersManager 
          handbookId={handbookData.id} 
          currentUserId={user.id}
        />
      </div>
    </div>
  );
} 