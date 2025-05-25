import React, { useState } from 'react';
import { Section, Page } from '../../types/handbook';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';

const sectionIcons: { [key: string]: string } = {
  'Allmän information': '🏠',
  'Ekonomi': '💰',
  'Underhåll': '🔧',
  'Regler': '📋',
  'Kontakt': '📞',
  'Default': '📄'
};

interface SidebarProps {
  sections: Section[];
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  currentPageId,
  onPageSelect,
  isOpen,
  onClose
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Find which section contains the current page and expand it
  React.useEffect(() => {
    if (currentPageId) {
      for (const section of sections) {
        if (section.pages?.some(page => page.id === currentPageId)) {
          setExpandedSections(prev => new Set([...prev, section.id]));
          break;
        }
      }
    }
  }, [currentPageId, sections]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handlePageClick = (pageId: string) => {
    onPageSelect(pageId);
    // Only close sidebar on mobile
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay - only show on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative top-0 left-0 h-full bg-white border-r border-gray-200 z-50
          transition-all duration-300 ease-in-out
          ${isOpen 
            ? 'translate-x-0 w-80 lg:w-72' 
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0'
          }
        `}
      >
        <div className={`flex flex-col h-full ${!isOpen ? 'lg:hidden' : ''}`}>
          {/* Header spacer for mobile */}
          <div className="h-16 lg:hidden border-b border-gray-200"></div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4">
            <div className="space-y-3">
              {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const hasCurrentPage = section.pages?.some(page => page.id === currentPageId);
                
                return (
                  <div key={section.id} className="space-y-1">
                    {/* Section Header */}
                    <button
                      className={`
                        w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200
                        ${hasCurrentPage 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'hover:bg-gray-50 text-gray-700 hover:shadow-sm border border-transparent hover:border-gray-200'
                        }
                      `}
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-lg">
                          {sectionIcons[section.title] || sectionIcons.Default}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium text-sm block">{section.title}</span>
                          <span className={`text-xs ${hasCurrentPage ? 'text-blue-200' : 'text-gray-500'}`}>
                            {section.pages?.length || 0} sidor
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Page Count Badge */}
                        {(section.pages?.length || 0) > 1 && (
                          <span className={`
                            px-2 py-1 text-xs rounded-full font-medium
                            ${hasCurrentPage ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
                          `}>
                            {section.pages?.length}
                          </span>
                        )}
                        
                        {/* Expand Arrow */}
                        {(section.pages?.length || 0) > 0 && (
                          isExpanded ? (
                            <ChevronDown className={`w-4 h-4 ${hasCurrentPage ? 'text-blue-200' : 'text-gray-400'}`} />
                          ) : (
                            <ChevronRight className={`w-4 h-4 ${hasCurrentPage ? 'text-blue-200' : 'text-gray-400'}`} />
                          )
                        )}
                      </div>
                    </button>

                    {/* Sub-pages */}
                    {isExpanded && section.pages && section.pages.length > 0 && (
                      <div className="ml-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {section.pages.map((page) => (
                          <button
                            key={page.id}
                            onClick={() => handlePageClick(page.id)}
                            className={`
                              w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-200
                              ${currentPageId === page.id 
                                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                : 'hover:bg-gray-50 text-gray-600 border border-transparent hover:border-gray-200'
                              }
                            `}
                          >
                            <FileText 
                              className={`
                                w-4 h-4 flex-shrink-0
                                ${currentPageId === page.id ? 'text-blue-500' : 'text-gray-400'}
                              `} 
                            />
                            <span className="text-sm font-medium flex-1 truncate">
                              {page.title}
                            </span>
                            
                            {currentPageId === page.id && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p className="flex items-center justify-center gap-2">
                <span>📞</span>
                <span>Akut: 08-123 456 78</span>
              </p>
              <p className="flex items-center justify-center gap-2">
                <span>📧</span>
                <span>styrelsen@ekstugan15.se</span>
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}; 