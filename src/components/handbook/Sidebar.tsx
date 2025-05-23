import React, { useState } from 'react';
import { Section, sectionIcons } from '@/lib/templates/handbook-template';

interface SidebarProps {
  sections: Section[];
  currentSection: string;
  currentPage: string;
  isOpen: boolean;
  onSectionChange: (sectionId: string, pageId?: string) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  currentSection,
  currentPage,
  isOpen,
  onSectionChange,
  onClose
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([currentSection]));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      <nav className={`
        fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-80 bg-white border-r border-gray-200 
        transform transition-transform duration-300 z-50 overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Digital Handbok</h2>
          <p className="text-sm text-gray-600">Allt du behöver veta om ditt boende</p>
        </div>

        <div className="p-4">
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const isActive = currentSection === section.id;
            
            return (
              <div key={section.id} className="mb-2">
                <button
                  className={`
                    w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors
                    ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}
                  `}
                  onClick={() => {
                    onSectionChange(section.id);
                    toggleSection(section.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{sectionIcons[section.title] || '📄'}</span>
                    <span className="font-medium text-sm">{section.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {section.pages.length > 1 && (
                      <span className={`
                        px-2 py-1 text-xs rounded-full
                        ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}
                      `}>
                        {section.pages.length}
                      </span>
                    )}
                    {section.pages.length > 1 && (
                      <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && section.pages.length > 1 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {section.pages.map((page) => (
                      <button
                        key={page.id}
                        className={`
                          w-full text-left p-2 rounded text-sm transition-colors
                          ${currentPage === page.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}
                        `}
                        onClick={() => onSectionChange(section.id, page.id)}
                      >
                        {page.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}; 