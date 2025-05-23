'use client';

import React, { useState, useEffect } from 'react';
import { Section, Page } from '@/lib/templates/handbook-template';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ContentArea } from './ContentArea';

interface ModernHandbookClientProps {
  handbookData: {
    title: string;
    sections: Section[];
  };
}

export const ModernHandbookClient: React.FC<ModernHandbookClientProps> = ({
  handbookData
}) => {
  const [currentSection, setCurrentSection] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Initiera med första sektionen
  useEffect(() => {
    if (handbookData.sections.length > 0) {
      const firstSection = handbookData.sections[0];
      setCurrentSection(firstSection.id);
      if (firstSection.pages.length > 0) {
        setCurrentPage(firstSection.pages[0].id);
      }
    }
  }, [handbookData.sections]);

  const handleSectionChange = (sectionId: string, pageId?: string) => {
    setCurrentSection(sectionId);
    
    const section = handbookData.sections.find(s => s.id === sectionId);
    if (section) {
      if (pageId) {
        setCurrentPage(pageId);
      } else if (section.pages.length > 0) {
        setCurrentPage(section.pages[0].id);
      }
    }
    
    // Stäng sidebar på mobil
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false);
    }
  };

  const getCurrentSection = (): Section | undefined => {
    return handbookData.sections.find(s => s.id === currentSection);
  };

  const getCurrentPage = (): Page | undefined => {
    const section = getCurrentSection();
    return section?.pages.find(p => p.id === currentPage);
  };

  return (
    <div className="handbook-app" style={{ fontFamily: "'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif" }}>
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        handbookTitle={handbookData.title}
      />
      
      <div className="flex">
        <Sidebar
          sections={handbookData.sections}
          currentSection={currentSection}
          currentPage={currentPage}
          isOpen={isSidebarOpen}
          onSectionChange={handleSectionChange}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <ContentArea
          section={getCurrentSection()}
          page={getCurrentPage()}
          sections={handbookData.sections}
          onPageChange={(pageId) => setCurrentPage(pageId)}
          onSectionChange={handleSectionChange}
        />
      </div>
    </div>
  );
}; 