import React, { useState, useEffect } from 'react';
import { Menu, Search, Share, Printer, X, Edit, Save, LogIn, Edit3, Eye } from 'lucide-react';
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
  const { user, signOut } = useAuth();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    
    // Check on mount
    checkMobile();
    
    // Add event listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMenuClick = () => {
    if (sidebarOpen) {
      (onCloseSidebar || onToggleSidebar)();
    } else {
      onToggleSidebar();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: handbookTitle,
          text: `Kolla in ${handbookTitle}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert('Länk kopierad till urklipp!');
    }
  };

  return (
    <>
      <style jsx>{`
        .search-input {
          padding-left: 40px !important;
        }
      `}</style>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left section - Menu button only on mobile */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            {/* Single toggle button - only show on mobile */}
            {isMobile && (
              <button
                onClick={handleMenuClick}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0 items-center justify-center"
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                title={sidebarOpen ? 'Stäng meny' : 'Öppna meny'}
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>
            )}
          </div>

          {/* Center section - Search with more space now */}
          <div className="hidden md:flex flex-1 justify-center max-w-lg mx-6">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '12px' }}>
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Sök i handboken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input w-full pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Edit mode toggle - only show if user can edit */}
            {canEdit && onToggleEditMode && (
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={onToggleEditMode}
                className="hidden sm:flex"
              >
                {isEditMode ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Spara
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Redigera
                  </>
                )}
              </Button>
            )}

            {/* User authentication */}
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 hidden lg:block">
                  {user.email}
                </span>
                <Button
                  onClick={signOut}
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex"
                >
                  Logga ut
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <LogIn className="w-4 h-4 mr-2" />
                  Logga in
                </Button>
              </Link>
            )}

            <button
              onClick={handleShare}
              className="hidden sm:flex p-2 rounded-md hover:bg-gray-100 transition-colors items-center justify-center"
              title="Dela handbok"
            >
              <Share className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={handlePrint}
              className="hidden sm:flex p-2 rounded-md hover:bg-gray-100 transition-colors items-center justify-center"
              title="Skriv ut"
            >
              <Printer className="w-5 h-5 text-gray-600" />
            </button>

            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
              Kontakta oss
            </button>
          </div>
        </div>

        {/* Edit mode indicator */}
        {isEditMode && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Redigeringsläge aktivt</span>
                <span className="text-xs text-blue-600">Klicka på innehåll för att redigera</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleEditMode}
                className="text-blue-600 hover:text-blue-800"
              >
                Avsluta redigering
              </Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}; 