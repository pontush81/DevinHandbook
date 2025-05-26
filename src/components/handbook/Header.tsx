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
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onCloseSidebar,
  handbookTitle,
  handbookSubtitle,
  sidebarOpen = false,
  canEdit = false,
  isEditMode = false,
  onToggleEditMode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  return (
    <header className="app-header">
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
          <div className="search-container">
            <input
              type="text"
              placeholder="Sök..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        {/* Right section - Actions */}
        <div className="header-right">
          {/* Support button */}
          <button className="support-btn">
            <span className="support-icon">📞</span>
            <span className="support-text">Support</span>
          </button>

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