'use client';

import React, { useState } from 'react';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(undefined);

  console.log('🔥 MODERN CLIENT RENDERING:', {
    handbookTitle: initialData?.title,
    sectionsCount: initialData?.sections?.length,
    sectionsData: initialData?.sections,
    currentPageId: currentPageId || 'welcome-page',
    sidebarOpen
  });

  const handlePageSelect = (pageId: string) => {
    setCurrentPageId(pageId);
    setSidebarOpen(false); // Close mobile sidebar
  };

  const toggleSidebar = () => {
    console.log('🔄 TOGGLE SIDEBAR:', !sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    console.log('🔴 CLOSE SIDEBAR CALLED');
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

        {/* Main content */}
        <ContentArea
          sections={initialData.sections}
          currentPageId={currentPageId}
        />
      </div>
    </div>
  );
}; 