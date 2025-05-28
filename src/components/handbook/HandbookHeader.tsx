import React from 'react';
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
}

export const HandbookHeader: React.FC<HandbookHeaderProps> = ({
  handbookTitle,
  canEdit = false,
  isEditMode = false,
  onToggleEditMode
}) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleToggleEdit = () => {
    if (canEdit && onToggleEditMode) {
      onToggleEditMode();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b transition-all duration-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-12 items-center">
        
        {/* Left section - Sidebar trigger + Brand */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Sidebar trigger för både mobil och desktop */}
          <SidebarTrigger />
          
          {/* Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-5 w-5 rounded bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">H</span>
              </div>
              <span className="hidden font-bold sm:inline-block text-blue-600 text-sm">
                Handbok.org
              </span>
            </Link>
            
            {/* Handbook title */}
            <div className="hidden sm:block">
              <span className="text-gray-400 text-sm">/</span>
              <span className="ml-2 text-sm font-medium text-gray-900 truncate max-w-[200px]">
                {handbookTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Right section - Edit button + User menu */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          
          {/* Edit button - only show if user can edit */}
          {canEdit && (
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={handleToggleEdit}
              className="hidden sm:flex items-center gap-2"
            >
              <Edit className="h-3 w-3" />
              {isEditMode ? "Avsluta redigering" : "Redigera"}
            </Button>
          )}
          
          {/* User menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase() || 'U'}
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
                
                {/* Mobile edit button */}
                {canEdit && (
                  <>
                    <DropdownMenuItem onClick={handleToggleEdit} className="sm:hidden">
                      <Edit className="mr-2 h-4 w-4" />
                      {isEditMode ? "Avsluta redigering" : "Redigera"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="sm:hidden" />
                  </>
                )}
                
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
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
          ) : (
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
}; 