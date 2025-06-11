'use client';

import React, { useState } from 'react';
import { Settings, MessageSquare, Bell, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

interface HandbookAdminSettingsProps {
  handbookData: {
    id: string;
    title: string;
    forum_enabled?: boolean;
  };
  handbookSlug: string;
  isAdmin: boolean;
  onUpdateHandbook?: (handbookId: string, updates: { forum_enabled?: boolean }) => void;
  onOpenMembersManager?: () => void;
}

export function HandbookAdminSettings({ 
  handbookData, 
  handbookSlug,
  isAdmin, 
  onUpdateHandbook,
  onOpenMembersManager 
}: HandbookAdminSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Guard clauses
  if (!isAdmin) return null;
  if (!handbookData || !handbookSlug) {
    console.warn('HandbookAdminSettings: Missing required props', { handbookData: !!handbookData, handbookSlug: !!handbookSlug });
    return null;
  }

  // Debug info
  console.log('🔍 HandbookAdminSettings render:', {
    handbookData,
    handbookSlug,
    isExpanded,
    isUpdating,
    onUpdateHandbook: !!onUpdateHandbook
  });

  const handleForumToggle = async (checked: boolean) => {
    if (!onUpdateHandbook) {
      console.error('onUpdateHandbook is not provided');
      return;
    }
    
    console.log('🔄 Forum toggle started:', { checked, handbookId: handbookData.id });
    setIsUpdating(true);
    
    try {
      await onUpdateHandbook(handbookData.id, { forum_enabled: checked });
      console.log('✅ Forum toggle successful');
    } catch (error) {
      console.error('❌ Error updating forum setting:', error);
      // Optionally show a toast/alert here
    } finally {
      setIsUpdating(false);
      console.log('🏁 Forum toggle finished');
    }
  };

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-900 text-lg">Handboksinställningar</CardTitle>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-amber-700 hover:bg-amber-100"
            >
              {isExpanded ? '↑ Dölj' : '↓ Visa alla'}
            </Button>
          </div>
        </div>
        {!isExpanded && (
          <CardDescription className="text-amber-700">
            Hantera meddelanden, medlemmar och andra inställningar för denna handbok
          </CardDescription>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Meddelanden/Forum Inställning */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-gray-900">Meddelanden & Forum</h4>
                <p className="text-sm text-gray-600">
                  Låt boende ställa frågor och dela tips med varandra
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Custom visible toggle - fixed position */}
              <button
                onClick={() => handleForumToggle(!handbookData.forum_enabled)}
                disabled={isUpdating}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${handbookData.forum_enabled ? 'bg-blue-600' : 'bg-gray-300'}
                  ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${handbookData.forum_enabled ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
              
              {/* Status text */}
              <span className="text-sm font-medium text-gray-700">
                {isUpdating ? 'Sparar...' : (handbookData.forum_enabled ? 'Aktiverat' : 'Inaktiverat')}
              </span>
              
              {/* Spacer to push button to the right */}
              <div className="flex-1"></div>
              
              {/* View messages button - always reserves space */}
              <div className="w-40">
                {handbookData.forum_enabled && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${handbookSlug}/meddelanden`}>
                      Visa meddelanden
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Notifikationer */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-purple-600" />
              <div>
                <h4 className="font-medium text-gray-900">Notifikationssystem</h4>
                <p className="text-sm text-gray-600">
                  Hantera e-post och app-notifikationer för alla medlemmar
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${handbookSlug}/notifications`}>
                Konfigurera
              </Link>
            </Button>
          </div>

          {/* Medlemshantering */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-gray-900">Medlemshantering</h4>
                <p className="text-sm text-gray-600">
                  Bjud in nya medlemmar och hantera användarroller
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onOpenMembersManager}
            >
              Hantera medlemmar
            </Button>
          </div>

          {/* Info om inställningar */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>💡 Tips:</strong> Dessa inställningar påverkar hela handboken. 
              Medlemmar kan också anpassa sina egna notifikationsinställningar via menyn.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 