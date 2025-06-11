'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, MessageSquare, Bell, Users, Save, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';



interface AdminSettingsClientProps {
  handbookData: {
    id: string;
    title: string;
    slug: string;
    forum_enabled?: boolean;
    created_by: string;
  };
  handbookSlug: string;
}

export default function AdminSettingsClient({ 
  handbookData, 
  handbookSlug 
}: AdminSettingsClientProps) {
  const router = useRouter();
  const [settings, setSettings] = useState({
    forum_enabled: handbookData.forum_enabled || false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateSetting = async (key: string, value: boolean) => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('handbooks')
        .update({ [key]: value })
        .eq('id', handbookData.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      setMessage({ 
        type: 'success', 
        text: 'Inställningen har sparats!' 
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Error updating setting:', error);
      setMessage({ 
        type: 'error', 
        text: 'Kunde inte spara inställningen. Försök igen.' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${handbookSlug}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka till handbok
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="h-6 w-6 text-amber-600" />
                Handboksinställningar
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Hantera inställningar för <strong>{handbookData.title}</strong>
              </p>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Admin
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Status Messages */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Handboksinställningar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Meddelanden & Forum
            </CardTitle>
            <CardDescription>
              Aktivera eller inaktivera meddelandefunktionen för din handbok
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Forum Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <h4 className="font-medium text-gray-900">Aktivera meddelanden</h4>
                <p className="text-sm text-gray-600">
                  Låt boende ställa frågor och dela tips med varandra
                </p>
                {settings.forum_enabled && (
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">Meddelanden är aktiverat</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${handbookSlug}/meddelanden`}>
                        Visa meddelanden
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
              <Switch
                checked={settings.forum_enabled}
                onCheckedChange={(checked) => handleUpdateSetting('forum_enabled', checked)}
                disabled={saving}
              />
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Om meddelandefunktionen</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Medlemmar kan skapa meddelanden och ställa frågor</li>
                <li>• Andra kan svara och dela tips</li>
                <li>• Du kan hantera notifikationsinställningar separat</li>
                <li>• Meddelanden stöder kategorier för bättre organisation</li>
              </ul>
            </div>
          </CardContent>
        </Card>





        {/* Medlemshantering */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Medlemshantering
            </CardTitle>
            <CardDescription>
              Hantera medlemmar och deras roller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-green-300" />
              <h4 className="font-medium text-gray-900 mb-2">Medlemshantering</h4>
              <p className="text-gray-600 mb-4">
                Bjud in nya medlemmar och hantera användarroller
              </p>
              <Button variant="outline" asChild>
                <Link href={`/${handbookSlug}/members`}>
                  Hantera medlemmar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Behöver du hjälp?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Om du har frågor om handboksinställningar, kontakta oss via support.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/support">
                  Kontakta support
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/docs">
                  Dokumentation
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 