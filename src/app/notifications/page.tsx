'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BookOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import NotificationSettings from '@/components/NotificationSettings';

interface Handbook {
  id: string;
  name: string;
  subdomain: string; // Database field name (represents path slug)
}

export default function GeneralNotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      loadUserHandbooks();
    }
  }, [user, authLoading, router]);

  async function loadUserHandbooks() {
    if (!user) return;

    try {
      setLoading(true);

      // Hämta alla handböcker som användaren är medlem i
      const { data: memberHandbooks, error } = await supabase
        .from('handbook_members')
        .select(`
          handbook_id,
          handbooks!inner (
            id,
            name,
            subdomain
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading handbooks:', error);
        return;
      }

      const handbookList = memberHandbooks?.map(member => ({
        id: member.handbooks.id,
        name: member.handbooks.name,
        subdomain: member.handbooks.subdomain // This represents the path slug
      })) || [];

      setHandbooks(handbookList);

      // Om användaren bara är medlem i en handbok, redirecta dit
      if (handbookList.length === 1) {
        router.push(`/${handbookList[0].subdomain}/notifications`);
        return;
      }

    } catch (err) {
      console.error('Error loading handbooks:', err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bell className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Laddar dina handböcker...</p>
        </div>
      </div>
    );
  }

  if (handbooks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                Du är inte medlem i någon handbok ännu. 
                Notifikationsinställningar finns tillgängliga när du blir medlem i en handbok.
              </AlertDescription>
            </Alert>
            <div className="mt-4 space-y-2">
              <Button asChild className="w-full">
                <Link href="/dashboard">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Gå till Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-6 w-6 text-blue-600" />
                Notifikationsinställningar
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Hantera dina notifikationer för alla handböcker
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          {/* Översikt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dina handböcker</CardTitle>
              <CardDescription>
                Du är medlem i {handbooks.length} handbok{handbooks.length !== 1 ? 'öcker' : ''}. 
                Klicka på en handbok för att hantera dess notifikationsinställningar.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Lista över handböcker */}
          <div className="space-y-4">
            {handbooks.map((handbook) => (
              <Card key={handbook.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {handbook.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        handbok.org/{handbook.subdomain}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Button asChild className="w-full">
                        <Link href={`/${handbook.subdomain}/notifications`}>
                          <Bell className="h-4 w-4 mr-2" />
                          Notifikationer
                        </Link>
                      </Button>
                      <Button variant="outline" asChild className="w-full">
                        <Link href={`/${handbook.subdomain}`}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          Visa handbok
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Om notifikationer</h4>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>Varje handbok har sina egna notifikationsinställningar</li>
                    <li>Du kan anpassa inställningar separat för varje handbok</li>
                    <li>Ändringarna sparas automatiskt</li>
                    <li>Du kan även nå inställningarna via menyn när du är i en handbok</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 