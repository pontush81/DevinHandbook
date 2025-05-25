import React, { useState } from 'react';
import { Menu, Search, Share, Printer, X } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onCloseSidebar?: () => void;
  handbookTitle: string;
  handbookSubtitle?: string;
  sidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onCloseSidebar,
  handbookTitle,
  handbookSubtitle,
  sidebarOpen = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  console.log('📋 HEADER RENDERING:', {
    sidebarOpen,
    handbookTitle,
    hasCloseSidebar: !!onCloseSidebar
  });

  const handleMenuClick = () => {
    console.log('🍔 HAMBURGER CLICKED, sidebarOpen:', sidebarOpen);
    if (sidebarOpen) {
      console.log('🔴 Using onCloseSidebar');
      (onCloseSidebar || onToggleSidebar)();
    } else {
      console.log('🔄 Using onToggleSidebar');
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
          {/* Left section - Just the menu button */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            {/* Hamburger Menu */}
            <button
              onClick={handleMenuClick}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0 flex items-center justify-center"
              aria-label="Toggle sidebar"
              title={sidebarOpen ? 'Stäng meny' : 'Öppna meny'}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
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
      </header>
    </>
  );
}; 