'use client';

import { useEffect, useState } from 'react';
import { Bell, Mail, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreferences {
  id: string;
  email_notifications: boolean;
}

interface NotificationSettingsProps {
  handbookId: string;
  handbookName: string;
}

export default function NotificationSettings({ handbookId, handbookName }: NotificationSettingsProps) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [handbookId]);

  async function loadPreferences() {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/notifications/preferences?handbook_id=${handbookId}&userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte ladda inställningar');
      }

      // Convert old format to new simplified format
      const emailEnabled = data.preferences?.email_new_topics || 
                          data.preferences?.email_new_replies || 
                          false;

      setPreferences({
        id: data.preferences?.id || '',
        email_notifications: emailEnabled
      });
    } catch (error) {
      console.error('Error loading preferences:', error);
      setMessage({ type: 'error', text: 'Kunde inte ladda notifikationsinställningar' });
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!preferences || !user?.id) return;

    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handbook_id: handbookId,
          user_id: user.id,
          // Map simplified setting to old format for backward compatibility
          email_new_topics: preferences.email_notifications,
          email_new_replies: preferences.email_notifications,
          email_mentions: false,
          app_new_topics: false,
          app_new_replies: false,
          app_mentions: false
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

  function toggleEmailNotifications() {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      email_notifications: !preferences.email_notifications
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
          Välj hur du vill få notifikationer för {handbookName}
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
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm">Få e-post om aktivitet i handboken</p>
              <p className="text-xs text-gray-600">
                Du får e-post när det skapas nya meddelanden eller svar
              </p>
            </div>
            <button
              onClick={toggleEmailNotifications}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.email_notifications ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.email_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
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