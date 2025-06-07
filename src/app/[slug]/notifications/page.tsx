import { notFound } from 'next/navigation';
import { Bell, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import NotificationSettings from '@/components/NotificationSettings';
import { getHandbookBySlug } from '@/lib/handbook-service';
import AdminNotificationControls from '@/components/AdminNotificationControls';

interface NotificationsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function NotificationsPage({ params }: NotificationsPageProps) {
  const { slug } = await params;

  console.log('🎯 [NotificationsPage] Loading handbook for slug:', slug);

  const handbookData = await getHandbookBySlug(slug);

  if (!handbookData) {
    console.log('❌ [NotificationsPage] No handbook found for slug:', slug);
    notFound();
  }

  console.log('✅ [NotificationsPage] Handbook loaded:', {
    id: handbookData.id,
    title: handbookData.title,
    slug: handbookData.slug
  });

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
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifikationsinställningar</h1>
              <p className="text-gray-600">Hantera hur du vill få notifikationer för {handbookData.title}</p>
            </div>
          </div>
        </div>

        {/* Notification Settings Component */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <NotificationSettings 
            handbookId={handbookData.id} 
            handbookName={handbookData.title}
          />
        </div>

        {/* Admin Notification Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <AdminNotificationControls 
            handbookId={handbookData.id}
            handbookName={handbookData.title}
            userRole="admin" // TODO: Get actual user role
          />
        </div>
      </div>
    </div>
  );
} 