import React, { useState, useEffect } from 'react';
import { Menu, Search, Phone, User, X, Edit, Save, LogIn, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  const handleSearchResultClick = (pageId: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    // This will be handled by the parent component
    window.location.hash = `page-${pageId}`;
  };

  return (
    <header className={`app-header ${isHeaderVisible ? 'header-visible' : 'header-hidden'}`}>
      <div className="header-container">
        {/* Left section - Brand */}
        <div className="header-left">
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={handleMenuClick}
              className="mobile-menu-btn"
              aria-label={sidebarOpen ? "Stäng meny" : "Öppna meny"}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          )}
          
          {/* Professional Brand */}
          <div className="brand">
            <span className="brand-icon">🏠</span>
            <span className="brand-text">{handbookTitle}</span>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="header-center">
          <div className="search-container relative">
            <input
              type="text"
              placeholder="Sök..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
            
            {/* Search results dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-2 max-h-96 overflow-y-auto z-50">
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-500 mb-3 px-1">
                    {searchResults.length} resultat för "{searchQuery}"
                  </div>
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.pageId}-${index}`}
                      onClick={() => handleSearchResultClick(result.pageId)}
                      className="w-full text-left p-3 hover:bg-blue-50 rounded-md border border-transparent hover:border-blue-100 transition-all duration-200 mb-1 last:mb-0"
                    >
                      <div className="font-medium text-sm text-gray-900 mb-1 line-clamp-1">
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
            
            {/* No results message */}
            {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-2 z-50">
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-2">🔍</div>
                  <div className="text-sm text-gray-600">
                    Inga resultat för "<span className="font-medium">{searchQuery}</span>"
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Prova att söka med andra ord
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right section - Actions */}
        <div className="header-right">
          {/* Edit mode toggle - only show if user can edit */}
          {canEdit && onToggleEditMode && (
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={onToggleEditMode}
              className="hidden sm:flex items-center space-x-2"
            >
              {isEditMode ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Spara</span>
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  <span>Redigera</span>
                </>
              )}
            </Button>
          )}

          {/* User menu */}
          {user ? (
            <div className="user-menu">
              <button
                onClick={handleUserMenuToggle}
                className="user-btn"
              >
                <span className="user-avatar">P</span>
                <span className="user-name">pontus.hberg</span>
                <span className="dropdown-icon">▼</span>
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <p className="user-email">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="user-dropdown-item"
                  >
                    Logga ut
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Logga in</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Edit mode indicator */}
      {isEditMode && (
        <div className="edit-mode-indicator">
          <div className="edit-mode-content">
            <Edit className="w-4 h-4 text-blue-600" />
            <span className="edit-mode-title">Redigeringsläge aktivt</span>
            <span className="edit-mode-subtitle">Klicka på innehåll för att redigera</span>
          </div>
        </div>
      )}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="user-menu-overlay" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}; 