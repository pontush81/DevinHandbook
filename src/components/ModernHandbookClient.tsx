'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './handbook/Header';
import { Sidebar } from './handbook/Sidebar';
import { ContentArea } from './handbook/ContentArea';
import { Section, Page } from '@/lib/templates/complete-brf-handbook';

interface ModernHandbookClientProps {
  initialData: {
    id: string;
    title: string;
    subtitle?: string;
    sections: Section[];
  };
}

export const ModernHandbookClient: React.FC<ModernHandbookClientProps> = ({ 
  initialData 
}) => {
  // Set initial sidebar state based on screen size
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Default to closed on mobile, open on desktop
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return false; // Default to closed for SSR
  });
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(undefined);

  // Handle window resize to automatically manage sidebar state
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      // On desktop, keep sidebar open unless explicitly closed
      // On mobile, keep sidebar closed unless explicitly opened
      if (isDesktop && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const handlePageSelect = (pageId: string) => {
    setCurrentPageId(pageId);
    // Only close sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (!initialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        onToggleSidebar={toggleSidebar}
        onCloseSidebar={closeSidebar}
        handbookTitle={initialData.title}
        handbookSubtitle={initialData.subtitle}
        sidebarOpen={sidebarOpen}
      />

      {/* Main layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar
          sections={initialData.sections}
          currentPageId={currentPageId}
          onPageSelect={handlePageSelect}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />

        {/* Main content - responsive margins based on sidebar state */}
        <div className="flex-1 overflow-hidden">
          <ContentArea
            sections={initialData.sections}
            currentPageId={currentPageId}
          />
        </div>
      </div>
    </div>
  );
}; 