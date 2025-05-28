"use client"

import React from 'react';
import { HandbookSection } from '@/types/handbook';
import { ModernSidebar, SidebarTrigger } from '@/components/handbook/ModernSidebar';
import { MainFooter } from '@/components/layout/MainFooter';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { User, Menu, LogOut, Settings, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HandbookLayoutProps {
  children: React.ReactNode;
  sections: HandbookSection[];
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onSectionSelect?: (sectionId: string) => void;
  handbookTitle?: string;
  showAuth?: boolean;
  className?: string;
  handbookId?: string;
}

export function HandbookLayout({
  children,
  sections,
  currentPageId,
  onPageSelect,
  onSectionSelect,
  handbookTitle = "Digital Handbok",
  showAuth = true,
  className,
  handbookId
}: HandbookLayoutProps) {
  const { user, signOut, isLoading } = useAuth();

  // Edit functionality - allow editing for logged in users in both dev and production
  const canEdit = !!user; // Any logged in user can edit (in production you'd check handbook ownership)

  console.log('🎯 HandbookLayout render state:', {
    user: !!user,
    isLoading,
    canEdit,
    environment: process.env.NODE_ENV,
    handbookId
  });

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex flex-col">
        {/* Header bar - ligger ovanför allt */}
        <header className="sticky top-0 z-40 w-full border-b bg-white/100 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
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
            <div className="flex flex-1 items-center justify-end space-x-3">
              {/* Edit button */}
              {canEdit && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={handbookId ? `/admin/content?handbook=${handbookId}` : '/dashboard'} className="flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Redigera</span>
                  </Link>
                </Button>
              )}

              {showAuth && (
                <>
                  {isLoading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  ) : user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                              {user.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {user.user_metadata?.full_name || 'Användare'}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Logga ut</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/login" className="text-sm flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Logga in
                      </Link>
                    </Button>
                  )}
                </>
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