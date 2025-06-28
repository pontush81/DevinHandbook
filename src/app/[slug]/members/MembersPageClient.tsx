'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MembersManager } from '@/components/handbook/MembersManager';
import { getNavigationContext, getDefaultBackLink } from '@/lib/navigation-utils';
import { useAuth } from '@/contexts/AuthContext';

interface MembersPageClientProps {
  handbookData: {
    id: string;
    title: string;
    slug: string;
  };
  handbookSlug: string;
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function MembersPageClient({ handbookData, handbookSlug, searchParams }: MembersPageClientProps) {
  const { user } = useAuth();

  // Get navigation context
  const urlSearchParams = new URLSearchParams(searchParams as Record<string, string>);
  const navigationContext = getNavigationContext(urlSearchParams, handbookSlug);
  const defaultBackLink = getDefaultBackLink(handbookSlug, handbookData.title);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Smart navigation based on where user came from */}
              <Link href={navigationContext?.href ?? defaultBackLink.href}>
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {navigationContext?.title ?? defaultBackLink.title}
                  </span>
                  <span className="sm:hidden">Tillbaka</span>
                </Button>
              </Link>
              
              {/* Secondary navigation to settings if not coming from settings */}
              {navigationContext?.source !== 'settings' && (
                <Link href={`/${handbookSlug}/settings`}>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Inställningar</span>
                  </Button>
                </Link>
              )}
            </div>
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
        {user && (
          <MembersManager 
            handbookId={handbookData.id} 
            currentUserId={user.id}
          />
        )}
      </div>
    </div>
  );
} 