'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import BookingCalendar from '@/components/booking/BookingCalendar';
import { Toaster } from 'sonner';
import { Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';


interface Handbook {
  id: string;
  title: string;
  slug: string;
}

interface Membership {
  role: string;
  user_id: string;
}

export default function BookingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, isLoading: authLoading } = useAuth();
  const [handbook, setHandbook] = useState<Handbook | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    async function loadBookingsPage() {
      if (authLoading || !user) return;

      try {
        console.log('📚 [BookingsPage] Loading handbook and membership for slug:', slug);
        console.log('👤 [BookingsPage] Current user:', user.id);

        // Steg 1: Hämta handbok
        const { data: handbookData, error: handbookError } = await supabase
          .from('handbooks')
          .select('id, title, slug')
          .eq('slug', slug)
          .single();

        if (handbookError || !handbookData) {
          console.error('❌ [BookingsPage] Handbook not found:', handbookError);
          setError('Handboken hittades inte');
          return;
        }

        console.log('✅ [BookingsPage] Handbook found:', handbookData);
        setHandbook(handbookData);

        // Steg 2: Kontrollera medlemskap
        const { data: membershipData, error: membershipError } = await supabase
          .from('handbook_members')
          .select('role, user_id')
          .eq('handbook_id', handbookData.id)
          .eq('user_id', user.id)
          .single();

        if (membershipError || !membershipData) {
          console.error('❌ [BookingsPage] User is not a member:', membershipError);
          setError('Du har inte behörighet att komma åt denna handbok');
          return;
        }

        console.log('✅ [BookingsPage] Membership confirmed:', membershipData);
        setMembership(membershipData);

      } catch (err) {
        console.error('❌ [BookingsPage] Error loading page:', err);
        setError('Ett fel uppstod när sidan laddades');
      } finally {
        setIsLoading(false);
      }
    }

    loadBookingsPage();
  }, [slug, user, authLoading, supabase]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Laddar bokningar...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !handbook || !membership) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Calendar className="h-12 w-12 mx-auto text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-800">Bokningar</h1>
          <p className="text-red-600">{error || 'Ett fel uppstod'}</p>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Bokningar - {handbook.title}
            </h1>
          </div>
          
          <BookingCalendar handbookId={handbook.id} userRole={membership.role} />
          <Toaster position="top-right" richColors />
        </div>
      </div>
    </div>
  );
} 