import React, { useState, useEffect } from 'react';
import { Menu, Search, Phone, User, X, Edit, Save, LogIn, ChevronDown, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onToggleSidebar: () => void;
  onCloseSidebar?: () => void;
  handbookTitle: string;
  handbookSubtitle?: string;
  sidebarOpen?: boolean;
  canEdit?: boolean;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onSearch?: (query: string) => void;
  searchResults?: Array<{
    pageId: string;
    pageTitle: string;
    sectionTitle: string;
    snippet: string;
  }>;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onCloseSidebar,
  handbookTitle,
  handbookSubtitle,
  sidebarOpen = false,
  canEdit = false,
  isEditMode = false,
  onToggleEditMode,
  onSearch,
  searchResults = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Smart scroll behavior - hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDifference = Math.abs(currentScrollY - lastScrollY);
      
      // Always show header at the very top
      if (currentScrollY < 10) {
        setIsHeaderVisible(true);
      }
      // Only hide/show if user has scrolled a meaningful amount
      else if (scrollDifference > 5) {
        // Hide when scrolling down past 100px
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsHeaderVisible(false);
        } 
        // Show when scrolling up
        else if (currentScrollY < lastScrollY) {
          setIsHeaderVisible(true);
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Debounce search
  useEffect(() => {
    if (!onSearch) return;
    
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        onSearch(searchQuery.trim());
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, onSearch]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.querySelector('.search-container');
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = () => {
    if (sidebarOpen) {
      (onCloseSidebar || onToggleSidebar)();
    } else {
      onToggleSidebar();
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSearchResultClick = (pageId: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    // This will be handled by the parent component
    window.location.hash = `page-${pageId}`;
  };

  return (
    <header className={`
      fixed top-0 left-0 right-0 z-50 
      bg-white/95 backdrop-blur-md border-b border-gray-200/50
      shadow-sm transition-all duration-300 ease-in-out
      ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}
    `}>
      {/* Edit mode banner */}
      {isEditMode && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Edit className="w-4 h-4" />
              <span className="text-sm font-medium">Redigeringsläge aktivt</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleEditMode}
              className="text-white hover:bg-white/20 h-8"
            >
              <Save className="w-4 h-4 mr-2" />
              Spara och avsluta
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Brand */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMenuClick}
                className="lg:hidden"
                aria-label={sidebarOpen ? "Stäng meny" : "Öppna meny"}
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            )}
            
            {/* Professional Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🏠</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">{handbookTitle}</h1>
                {handbookSubtitle && (
                  <p className="text-xs text-gray-500">{handbookSubtitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Center section - Search */}
          <div className="flex-1 max-w-lg mx-4">
            <div className="search-container relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Sök i handboken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all duration-200 text-sm"
                />
              </div>
              
              {/* Search results dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-2 max-h-96 overflow-y-auto z-50">
                  <div className="p-3">
                    <div className="text-xs font-medium text-gray-500 mb-3 px-1">
                      {searchResults.length} resultat för "{searchQuery}"
                    </div>
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.pageId}-${index}`}
                        onClick={() => handleSearchResultClick(result.pageId)}
                        className="w-full text-left p-3 hover:bg-blue-50 rounded-lg border border-transparent 
                                 hover:border-blue-100 transition-all duration-200 mb-1 last:mb-0 group"
                      >
                        <div className="font-medium text-sm text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-700">
                          {result.pageTitle}
                        </div>
                        <div className="text-xs text-blue-600 mb-2 font-medium">
                          📁 {result.sectionTitle}
                        </div>
                        <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {result.snippet}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center space-x-3">
            {/* Support button */}
            <Button variant="outline" size="sm" className="hidden sm:flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>Support</span>
            </Button>

            {/* Edit mode toggle */}
            {canEdit && !isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleEditMode}
                className="hidden sm:flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Redigera</span>
                {process.env.NODE_ENV === 'development' && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">DEV</span>
                )}
              </Button>
            )}

            {/* User menu */}
            {user ? (
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
                  {canEdit && (
                    <>
                      <DropdownMenuItem onClick={onToggleEditMode}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>{isEditMode ? 'Avsluta redigering' : 'Redigera handbok'}</span>
                        {process.env.NODE_ENV === 'development' && (
                          <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-1 rounded">DEV</span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Inställningar</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Logga ut</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Logga in
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}; 