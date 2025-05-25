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
  // Standard responsive behavior: closed on mobile, always open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // Always open on desktop
    }
    return false; // Closed by default for SSR
  });
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(undefined);

  // Handle window resize - standard responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop) {
        // On desktop, sidebar is always open and cannot be closed
        setSidebarOpen(true);
      } else {
        // On mobile, keep current state (user can toggle)
        // Don't auto-close when resizing to mobile
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePageSelect = (pageId: string) => {
    setCurrentPageId(pageId);
    // Always close sidebar on mobile when selecting a page
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    // Only allow toggling on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const closeSidebar = () => {
    // Only allow closing on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
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
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
        {/* Sidebar */}
        <Sidebar
          sections={initialData.sections}
          currentPageId={currentPageId}
          onPageSelect={handlePageSelect}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />

        {/* Main content */}
        <div className="flex-1 bg-gray-50 min-h-full overflow-hidden">
          <ContentArea
            sections={initialData.sections}
            currentPageId={currentPageId}
          />
        </div>
      </div>
    </div>
  );
}; 