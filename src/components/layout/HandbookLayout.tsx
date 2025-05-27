"use client"

import React from 'react';
import { HandbookSection } from '@/types/handbook';
import { ModernSidebar, SidebarTrigger } from '@/components/handbook/ModernSidebar';
import { MainFooter } from '@/components/layout/MainFooter';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { User, Menu } from 'lucide-react';

interface HandbookLayoutProps {
  children: React.ReactNode;
  sections: HandbookSection[];
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onSectionSelect?: (sectionId: string) => void;
  handbookTitle?: string;
  showAuth?: boolean;
  className?: string;
}

export function HandbookLayout({
  children,
  sections,
  currentPageId,
  onPageSelect,
  onSectionSelect,
  handbookTitle = "Digital Handbok",
  showAuth = true,
  className
}: HandbookLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex flex-col">
        {/* Header bar - ligger ovanför allt */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
          <div className="flex h-14 items-center px-4">
            {/* Vänster sida - Toggle + Logo */}
            <div className="flex items-center gap-3">
              {/* Toggle för både mobil och desktop */}
              <SidebarTrigger />
              
              {/* Logo/Titel */}
              <Link href="/" className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">H</span>
                </div>
                <span className="font-bold text-blue-600 text-lg">
                  Handbok.org
                </span>
              </Link>
            </div>

            {/* Höger sida - Auth */}
            <div className="flex flex-1 items-center justify-end">
              {showAuth && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login" className="text-sm flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Logga in
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main layout med sidebar under header */}
        <div className="flex-1 flex relative">
          {/* Modern Sidebar - börjar under header */}
          <div className="relative z-30">
            <ModernSidebar
              sections={sections}
              currentPageId={currentPageId}
              onPageSelect={onPageSelect}
              onSectionSelect={onSectionSelect}
              className={className}
            />
          </div>
          
          {/* Main content area */}
          <SidebarInset className="flex-1 flex flex-col min-w-0">
            {/* Main content */}
            <main className="flex-1 overflow-auto w-full">
              {children}
            </main>
            
            {/* Footer */}
            <MainFooter variant="app" />
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
} 