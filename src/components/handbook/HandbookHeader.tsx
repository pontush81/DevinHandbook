import React, { useEffect } from 'react';
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
import { User, LogOut, Edit, Settings } from 'lucide-react';

interface HandbookHeaderProps {
  handbookTitle: string;
  canEdit?: boolean;
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
  canEdit = false,
  isEditMode = false,
  onToggleEditMode,
  theme
}) => {
  const { user, signOut } = useAuth();

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

  const getUserInitial = () => {
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
      <div className="w-full px-0 flex h-12 items-center justify-between">
        
        {/* Left section - Sidebar trigger and Brand pushed to far left */}
        <div className="flex items-center space-x-3 flex-shrink-0 min-w-0 pl-0">
          {/* Sidebar trigger längst till vänster utan padding */}
          <SidebarTrigger className="flex-shrink-0 ml-0 mr-3" />
          
          {/* Brand section with tighter spacing */}
          <div className="flex items-center space-x-2 min-w-0">
            <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
              <div 
                className="h-5 w-5 rounded flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-white text-xs font-bold">H</span>
              </div>
              <span 
                className="hidden font-bold sm:inline-block text-sm"
                style={{ color: primaryColor }}
              >
                Handbok.org
              </span>
            </Link>
            
            {/* Handbook title with separator */}
            <div className="hidden sm:flex items-center min-w-0">
              <span className="text-gray-300 text-sm mx-2">|</span>
              <span className="text-sm font-medium text-gray-900 truncate max-w-[200px] md:max-w-[300px]">
                {handbookTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Right section - Edit button and User menu */}
        <div className="flex items-center space-x-3 flex-shrink-0 pr-4" data-debug="handbook-header-right">
          {/* Edit button for admins - prominent placement */}
          {canEdit && (
            <Button 
              onClick={handleToggleEdit}
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
              style={isEditMode ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isEditMode ? "Stäng redigering" : "Redigera"}
              </span>
            </Button>
          )}
          
          {/* User menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 h-8 px-2 hover:bg-gray-100" 
                  data-debug="handbook-user-trigger"
                >
                  <Avatar className="h-6 w-6 flex-shrink-0" data-component="handbook-avatar">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                    <AvatarFallback className="text-xs font-medium bg-gray-200" data-component="handbook-avatar">
                      {getUserInitial()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[120px] truncate flex-shrink-0">
                    {getUserDisplayName()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-lg rounded-md" align="end" forceMount>
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
                
                <DropdownMenuItem>
                  <Link href="/dashboard" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logga ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
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