'use client';

import React, { useState } from 'react';
import { Header } from './handbook/Header';
import { Sidebar } from './handbook/Sidebar';
import { ContentArea } from './handbook/ContentArea';
import { Section, Page } from '../types/handbook';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(undefined);

  console.log('🔥 MODERN CLIENT RENDERING:', {
    handbookTitle: initialData?.title,
    sectionsCount: initialData?.sections?.length,
    currentPageId: currentPageId || 'welcome-page',
    sidebarOpen
  });

  const handlePageSelect = (pageId: string) => {
    setCurrentPageId(pageId);
    setSidebarOpen(false); // Close mobile sidebar
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
          onClose={() => setSidebarOpen(false)}
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