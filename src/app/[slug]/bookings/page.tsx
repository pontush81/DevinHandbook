import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import BookingCalendar from '@/components/booking/BookingCalendar';
import { Toaster } from 'sonner';
import { Calendar } from 'lucide-react';

interface BookingsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: BookingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    // Hämta handbooksinfo för metadata
    const { data: handbook } = await supabase
      .from('handbooks')
      .select('title')
      .eq('slug', slug)
      .single();

    const handbookName = handbook?.title || 'Handbok';
    
    return {
      title: `Bokningar - ${handbookName}`,
      description: `Boka gemensamma utrymmen och resurser i ${handbookName}`,
      keywords: ['bokningar', 'handbok', 'bostadsrättsförening', 'resurser'],
    };
  } catch (error) {
    return {
      title: 'Bokningar - Handbok',
      description: 'Boka gemensamma utrymmen och resurser',
      keywords: ['bokningar', 'handbok', 'bostadsrättsförening', 'resurser'],
    };
  }
}

export default async function BookingsPage({ params }: BookingsPageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    // Kontrollera autentisering först
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('Auth error or no user:', authError);
      notFound();
    }

    // Steg 1: Hämta handboken
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, title, slug')
      .eq('slug', slug)
      .single();

    if (handbookError || !handbook) {
      console.error('Handbook not found:', handbookError);
      notFound();
    }

    // Steg 2: Kontrollera användarens medlemskap (separat fråga)
    const { data: membership, error: membershipError } = await supabase
      .from('handbook_members')
      .select('role, user_id')
      .eq('handbook_id', handbook.id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.error('Membership not found:', membershipError);
      notFound();
    }

    // Hämta trial status från user_profiles
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('trial_ends_at')
      .eq('user_id', user.id)
      .single();

    // Räkna ut trial status
    const isTrialExpired = userProfile?.trial_ends_at ? 
      new Date(userProfile.trial_ends_at) < new Date() : false;

    const userRole = membership.role as 'owner' | 'admin' | 'member' | 'moderator';

    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Bokningar</h1>
          </div>
          <p className="text-gray-600">
            Boka gemensamma utrymmen och resurser i {handbook.title}
          </p>
        </div>

        <BookingCalendar 
          handbookId={handbook.id}
          userRole={userRole}
          isTrialExpired={isTrialExpired}
        />
      </div>
    );
    
  } catch (error) {
    console.error('Error loading bookings page:', error);
    notFound();
  }
} 