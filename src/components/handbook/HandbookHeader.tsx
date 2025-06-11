import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Edit, Settings, ChevronDown, Bell, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

interface HandbookHeaderProps {
  handbookTitle: string;
  handbookSlug?: string;
  canEdit?: boolean;
  isAdmin?: boolean;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  theme?: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string | null;
  };
}

export const HandbookHeader: React.FC<HandbookHeaderProps> = React.memo(({
  handbookTitle,
  handbookSlug,
  canEdit = false,
  isAdmin = false,
  isEditMode = false,
  onToggleEditMode,
  theme
}) => {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Cleanup any duplicate user menus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      // Remove any duplicate user elements that might exist
      const duplicateElements = document.querySelectorAll('header [class*="rounded-full"]:not([data-component="handbook-avatar"])');
      duplicateElements.forEach((el, index) => {
        if (index > 0) { // Keep first, remove others
          el.remove();
        }
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleToggleEdit = () => {
    if (canEdit && onToggleEditMode) {
      onToggleEditMode();
    }
  };

  // Get user display name or email initial
  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Användare';
  };

  const getUserInitials = (user: any) => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get theme colors with fallbacks
  const primaryColor = theme?.primary_color || '#3498db';
  const secondaryColor = theme?.secondary_color || '#2c3e50';

  return (
    <header className="sticky top-0 z-50 w-full border-b transition-all duration-200 bg-white shadow-sm">
      <div className="w-full px-2 sm:px-4 flex h-12 items-center justify-between">
        
        {/* Left section - Sidebar trigger and Brand pushed to far left */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 min-w-0 pl-0">
          {/* Sidebar trigger längst till vänster utan padding */}
          <SidebarTrigger className="flex-shrink-0 ml-0 mr-2 sm:mr-3" />
          
          {/* Brand section with tighter spacing */}
          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
            <Link href="/" className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <div 
                className="h-4 w-4 sm:h-5 sm:w-5 rounded flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-white text-xs font-bold">H</span>
              </div>
              <span 
                className="hidden font-bold sm:inline-block text-xs sm:text-sm"
                style={{ color: primaryColor }}
              >
                Handbok.org
              </span>
            </Link>
            
            {/* Handbook title with separator */}
            <div className="hidden sm:flex items-center min-w-0">
              <span className="text-gray-300 text-sm mx-2">|</span>
              <span className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px]">
                {handbookTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Right section - Edit button and User menu */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0" data-debug="handbook-header-right">
          {/* Edit Mode Toggle */}
          {canEdit && (
            <Button
              onClick={onToggleEditMode}
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              className={`h-8 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-all duration-200 ${
                isEditMode 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">
                {isEditMode ? 'Spara' : 'Redigera'}
              </span>
              <span className="sm:hidden">
                {isEditMode ? 'Spara' : 'Redigera'}
              </span>
            </Button>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-8 w-8 sm:h-8 sm:w-auto sm:px-2 rounded-full sm:rounded-md"
                data-debug="handbook-user-trigger"
              >
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                  <AvatarImage 
                    src={user?.user_metadata?.avatar_url} 
                    alt={user?.user_metadata?.full_name || user?.email || "Användare"} 
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs sm:text-sm font-medium">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline ml-2 text-xs font-medium text-gray-700 truncate max-w-[100px]">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Användare'}
                </span>
                <ChevronDown className="hidden sm:inline h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 sm:w-56 bg-white border border-gray-200 shadow-lg rounded-md mr-2 sm:mr-0" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 p-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.full_name || 'Användare'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Dashboard - endast för admins */}
              {isAdmin && (
                <DropdownMenuItem className="min-h-[44px] sm:min-h-[36px]">
                  <Link href="/dashboard" className="flex items-center w-full">
                    <Settings className="mr-3 h-4 w-4" />
                    <span className="text-sm">Dashboard</span>
                  </Link>
                </DropdownMenuItem>
              )}

              {/* Admin Settings - endast för admins */}
              {isAdmin && (
                <>
                  <DropdownMenuItem className="min-h-[44px] sm:min-h-[36px]">
                    <Link href={`/${handbookSlug}/members`} className="flex items-center w-full">
                      <Users className="mr-3 h-4 w-4" />
                      <span className="text-sm">Hantera medlemmar</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="min-h-[44px] sm:min-h-[36px]">
                    <Link href={`/${handbookSlug}/admin-settings`} className="flex items-center w-full">
                      <Settings className="mr-3 h-4 w-4" />
                      <span className="text-sm">Handboksinställningar</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuItem className="min-h-[44px] sm:min-h-[36px]">
                <Link href={handbookSlug ? `/${handbookSlug}/notifications` : "/notifications"} className="flex items-center w-full">
                  <Bell className="mr-3 h-4 w-4" />
                  <span className="text-sm">Notifikationer</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="min-h-[44px] sm:min-h-[36px]">
                <LogOut className="mr-3 h-4 w-4" />
                <span className="text-sm">Logga ut</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {!user && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login" className="text-xs">
                <User className="mr-1 h-3 w-3" />
                Logga in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}); 