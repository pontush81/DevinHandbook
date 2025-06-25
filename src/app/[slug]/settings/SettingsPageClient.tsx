'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, MessageSquare, Mail, Users, User, Smartphone, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buildUrlWithSource } from '@/lib/navigation-utils';

interface SettingsPageClientProps {
  handbookData: {
    id: string;
    title: string;
    slug: string;
    forum_enabled?: boolean;
  };
  handbookSlug: string;
  userRole: 'admin' | 'editor' | 'viewer';
  userId: string;
}

export default function SettingsPageClient({ 
  handbookData, 
  handbookSlug,
  userRole,
  userId
}: SettingsPageClientProps) {
  const router = useRouter();
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [forumUpdating, setForumUpdating] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [forumEnabled, setForumEnabled] = useState(handbookData.forum_enabled || false);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadEmailPreferences();
  }, [handbookData.id]);

  async function loadEmailPreferences() {
    try {
      const response = await fetch(`/api/notifications/preferences?handbook_id=${handbookData.id}`);
      const data = await response.json();

      if (response.ok && data.preferences) {
        const hasEmailNotifications = data.preferences.email_new_topics || 
                                     data.preferences.email_new_replies;
        setEmailNotifications(hasEmailNotifications);
      }
    } catch (error) {
      console.error('Error loading email preferences:', error);
    }
  }

  async function handleEmailToggle(checked: boolean) {
    setEmailLoading(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handbook_id: handbookData.id,
          email_new_topics: checked,
          email_new_replies: checked,
          email_mentions: false,
          app_new_topics: false,
          app_new_replies: false,
          app_mentions: false
        }),
      });

      if (response.ok) {
        setEmailNotifications(checked);
        setMessage({ 
          type: 'success', 
          text: checked ? 'E-postnotifikationer aktiverade' : 'E-postnotifikationer inaktiverade' 
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating email preferences:', error);
      setMessage({ 
        type: 'error', 
        text: 'Kunde inte uppdatera e-postinställningar' 
      });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleForumToggle(checked: boolean) {
    setForumUpdating(true);
    try {
      const response = await fetch(`/api/handbook/${handbookData.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forum_enabled: checked
        }),
      });

      if (response.ok) {
        setForumEnabled(checked);
        setMessage({ 
          type: 'success', 
          text: checked ? 'Meddelanden aktiverade' : 'Meddelanden inaktiverade' 
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to update forum setting');
      }
    } catch (error) {
      console.error('Error updating forum setting:', error);
      setMessage({ 
        type: 'error', 
        text: 'Kunde inte uppdatera meddelandeinställning' 
      });
    } finally {
      setForumUpdating(false);
    }
  }

  async function handleManageSubscription() {
    setSubscriptionLoading(true);
    
    try {
      // Skapa Stripe Customer Portal session
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          returnUrl: `${window.location.origin}/${handbookSlug}/settings`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Misslyckades att skapa portal-session');
      }

      // Omdirigera till Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Ingen portal-URL mottagen');
      }

    } catch (error) {
      console.error('Fel vid hantering av prenumeration:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Något gick fel. Försök igen senare.'
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSubscriptionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-optimized Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="outline" size="sm" asChild className="flex-shrink-0">
              <Link href={`/${handbookSlug}`}>
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Tillbaka</span>
                <span className="sm:hidden">Tillbaka</span>
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                <span className="truncate">Inställningar</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                {handbookData.title}
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              {userRole === 'admin' ? 'Admin' : userRole === 'editor' ? 'Redaktör' : 'Läsare'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        
        {/* Status Messages */}
        {message && (
          <Alert className={`${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Admin Functions - Only visible to admins */}
        {isAdmin && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-amber-900 text-base sm:text-lg">Admin-funktioner</CardTitle>
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  Admin
                </Badge>
              </div>
              <CardDescription className="text-amber-700 text-sm">
                Inställningar som påverkar hela handboken
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3 sm:space-y-4">
              {/* Forum/Messages Setting */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg border border-amber-200 gap-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">Meddelanden & Forum</h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Låt boende ställa frågor och dela tips med varandra
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <button
                    onClick={() => handleForumToggle(!forumEnabled)}
                    disabled={forumUpdating}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0
                      ${forumEnabled ? 'bg-blue-600' : 'bg-gray-300'}
                      ${forumUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${forumEnabled ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 min-w-0">
                    {forumUpdating ? 'Sparar...' : (forumEnabled ? 'Aktiverat' : 'Inaktiverat')}
                  </span>
                                     {forumEnabled && (
                     <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                       <Link href={buildUrlWithSource(`/${handbookSlug}/meddelanden`, 'settings')}>
                         Visa meddelanden
                       </Link>
                     </Button>
                   )}
                </div>
              </div>

              {/* Show mobile button for messages */}
              {forumEnabled && (
                <div className="sm:hidden">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={buildUrlWithSource(`/${handbookSlug}/meddelanden`, 'settings')}>
                      Visa meddelanden
                    </Link>
                  </Button>
                </div>
              )}

              {/* Subscription Management */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg border border-amber-200 gap-3">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">Prenumerationshantering</h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Hantera betalning, säg upp eller ändra prenumerationsplan
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleManageSubscription}
                  disabled={subscriptionLoading}
                  className="self-start sm:self-center"
                >
                  <CreditCard className="h-4 w-4 mr-2 sm:hidden" />
                  {subscriptionLoading ? 'Laddar...' : 'Hantera prenumeration'}
                </Button>
              </div>

              {/* Member Management */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg border border-amber-200 gap-3">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">Medlemshantering</h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Bjud in nya medlemmar och hantera användarroller
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="self-start sm:self-center">
                  <Link href={buildUrlWithSource(`/${handbookSlug}/members`, 'settings')}>
                    <Users className="h-4 w-4 mr-2 sm:hidden" />
                    Hantera medlemmar
                  </Link>
                </Button>
              </div>

              {/* Info for admins */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>💡 Admin-funktioner:</strong> Dessa inställningar påverkar hela handboken och alla medlemmar.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Settings - Visible to everyone */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900 text-base sm:text-lg">Mina inställningar</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3 sm:space-y-4">
            {/* Email Notifications */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg border border-blue-200 gap-3">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base">E-post</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Få meddelanden via e-post
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-between sm:justify-end">
                <button
                  onClick={() => handleEmailToggle(!emailNotifications)}
                  disabled={emailLoading}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0
                    ${emailNotifications ? 'bg-blue-600' : 'bg-gray-300'}
                    ${emailLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${emailNotifications ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
                <span className="text-xs sm:text-sm font-medium text-gray-700 min-w-0">
                  {emailLoading ? 'Sparar...' : (emailNotifications ? 'Påslagen' : 'Avstängd')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
} 