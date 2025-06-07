'use client';

import { useEffect, useState } from 'react';
import { Bell, Mail, Smartphone, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NotificationPreferences {
  id: string;
  email_new_topics: boolean;
  email_new_replies: boolean;
  email_mentions: boolean;
  app_new_topics: boolean;
  app_new_replies: boolean;
  app_mentions: boolean;
}

interface NotificationSettingsProps {
  handbookId: string;
  handbookName: string;
}

export default function NotificationSettings({ handbookId, handbookName }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [handbookId]);

  async function loadPreferences() {
    try {
      const response = await fetch(`/api/notifications/preferences?handbook_id=${handbookId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte ladda inställningar');
      }

      setPreferences(data.preferences);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setMessage({ type: 'error', text: 'Kunde inte ladda notifikationsinställningar' });
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!preferences) return;

    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handbook_id: handbookId,
          ...preferences
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte spara inställningar');
      }

      setMessage({ type: 'success', text: 'Inställningarna har sparats!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Kunde inte spara inställningar' });
    } finally {
      setSaving(false);
    }
  }

  function updatePreference(key: keyof NotificationPreferences, value: boolean) {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      [key]: value
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Bell className="h-6 w-6 animate-spin mr-2" />
            <span>Laddar notifikationsinställningar...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <X className="h-4 w-4" />
            <AlertDescription>
              Kunde inte ladda notifikationsinställningar. Prova att ladda om sidan.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifikationsinställningar
        </CardTitle>
        <CardDescription>
          Hantera hur du vill få notifikationer för {handbookName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {message.type === 'success' ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* E-post-notifikationer */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Mail className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium">E-postnotifikationer</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Nya meddelanden</p>
                <p className="text-xs text-gray-600">
                  Få e-post när någon skapar ett nytt meddelande
                </p>
              </div>
              <Switch
                checked={preferences.email_new_topics}
                onCheckedChange={(checked) => updatePreference('email_new_topics', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Nya svar</p>
                <p className="text-xs text-gray-600">
                  Få e-post när någon svarar på meddelanden du deltar i
                </p>
              </div>
              <Switch
                checked={preferences.email_new_replies}
                onCheckedChange={(checked) => updatePreference('email_new_replies', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Omnämnanden</p>
                <p className="text-xs text-gray-600">
                  Få e-post när någon nämner dig (framtida funktion)
                </p>
              </div>
              <Switch
                checked={preferences.email_mentions}
                onCheckedChange={(checked) => updatePreference('email_mentions', checked)}
                disabled={true}
              />
            </div>
          </div>
        </div>

        {/* App-notifikationer */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Smartphone className="h-4 w-4 text-green-600" />
            <h3 className="font-medium">In-app notifikationer</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Nya meddelanden</p>
                <p className="text-xs text-gray-600">
                  Visa notifikationer i appen för nya meddelanden
                </p>
              </div>
              <Switch
                checked={preferences.app_new_topics}
                onCheckedChange={(checked) => updatePreference('app_new_topics', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Nya svar</p>
                <p className="text-xs text-gray-600">
                  Visa notifikationer i appen för nya svar
                </p>
              </div>
              <Switch
                checked={preferences.app_new_replies}
                onCheckedChange={(checked) => updatePreference('app_new_replies', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Omnämnanden</p>
                <p className="text-xs text-gray-600">
                  Visa notifikationer när någon nämner dig (framtida funktion)
                </p>
              </div>
              <Switch
                checked={preferences.app_mentions}
                onCheckedChange={(checked) => updatePreference('app_mentions', checked)}
                disabled={true}
              />
            </div>
          </div>
        </div>

        {/* Spara-knapp */}
        <div className="pt-4 border-t">
          <Button
            onClick={savePreferences}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Sparar...' : 'Spara inställningar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 