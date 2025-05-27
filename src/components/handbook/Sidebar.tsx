import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Edit3, ChevronRight, BookOpen, Users, Phone, Settings, 
  FileText, DollarSign, Wrench, Home, Info, MessageCircle
} from 'lucide-react';
import { HandbookSection } from '../../types/handbook';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createMenuFromSections, MenuItemConfig } from '@/lib/menu-generator';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  sections: HandbookSection[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  showMobileHeader?: boolean;
  canEdit?: boolean;
  onAddSection?: (title: string) => void;
  iconStyle?: 'emoji' | 'minimal' | 'none' | 'hybrid';
  compactMode?: boolean;
}

// Icon mapping for different section types
const getSectionIcon = (title: string) => {
  const normalizedTitle = title.toLowerCase();
  
  if (normalizedTitle.includes('välkommen') || normalizedTitle.includes('hem')) {
    return Home;
  }
  if (normalizedTitle.includes('kontakt') || normalizedTitle.includes('styrelse')) {
    return Users;
  }
  if (normalizedTitle.includes('telefon') || normalizedTitle.includes('support')) {
    return Phone;
  }
  if (normalizedTitle.includes('ekonomi') || normalizedTitle.includes('avgift')) {
    return DollarSign;
  }
  if (normalizedTitle.includes('felanmälan') || normalizedTitle.includes('underhåll')) {
    return Wrench;
  }
  if (normalizedTitle.includes('regler') || normalizedTitle.includes('stadgar')) {
    return FileText;
  }
  if (normalizedTitle.includes('info') || normalizedTitle.includes('information')) {
    return Info;
  }
  if (normalizedTitle.includes('frågor') || normalizedTitle.includes('faq')) {
    return MessageCircle;
  }
  
  return BookOpen; // Default icon
};

const getSectionColor = (title: string): string => {
  const normalizedTitle = title.toLowerCase();
  
  const colorMap: Record<string, string> = {
    'välkommen': 'text-blue-600 bg-blue-50',
    'kontakt': 'text-green-600 bg-green-50',
    'styrelse': 'text-green-600 bg-green-50',
    'felanmälan': 'text-orange-600 bg-orange-50',
    'underhåll': 'text-orange-600 bg-orange-50',
    'regler': 'text-purple-600 bg-purple-50',
    'stadgar': 'text-purple-600 bg-purple-50',
    'ekonomi': 'text-red-600 bg-red-50',
    'avgifter': 'text-red-600 bg-red-50',
    'information': 'text-indigo-600 bg-indigo-50',
    'frågor': 'text-gray-600 bg-gray-50',
  };
  
  // Try exact match first
  for (const [key, color] of Object.entries(colorMap)) {
    if (normalizedTitle.includes(key)) {
      return color;
    }
  }
  
  return 'text-gray-600 bg-gray-50'; // Default
};

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  currentPageId,
  onPageSelect,
  isOpen,
  onClose,
  showMobileHeader = true,
  canEdit = false,
  onAddSection,
  iconStyle = 'hybrid',
  compactMode = false
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Generate menu from sections using our intelligent system
  const menuGenerator = useMemo(() => {
    return createMenuFromSections(sections);
  }, [sections]);

  const menuItems = menuGenerator.getAllMenuItems();

  // Auto-expand section containing current page
  useEffect(() => {
    if (currentPageId) {
      const section = sections.find(s => 
        s.pages && s.pages.some(p => p.id === currentPageId)
      );
      if (section) {
        setExpandedSections(prev => new Set([...prev, section.id]));
      }
    }
  }, [currentPageId, sections]);

  const handleAddSection = () => {
    if (newSectionTitle.trim() && onAddSection) {
      onAddSection(newSectionTitle.trim());
      setNewSectionTitle('');
      setShowAddDialog(false);
    }
  };

  const handleSectionClick = (sectionId: string) => {
    // Clear current page selection to show all sections
    onPageSelect('');
    
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      onClose();
    }
    
    // Scroll to section
    setTimeout(() => {
      const sectionElement = document.getElementById(`section-${sectionId}`);
      if (sectionElement) {
        sectionElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handlePageClick = (pageId: string) => {
    onPageSelect(pageId);
    
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const isPageActive = (pageId: string): boolean => {
    return pageId === currentPageId;
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-80
        bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        flex flex-col shadow-lg lg:shadow-none
      `}>
        {/* Mobile header */}
        {showMobileHeader && (
          <div className="lg:hidden p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Navigation</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Header with spacing for fixed header */}
        <div className="pt-20 lg:pt-4">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Innehåll
              </h2>
              {canEdit && (
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Lägg till ny sektion</DialogTitle>
                      <DialogDescription>
                        Skapa en ny sektion i handboken.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Sektionsnamn"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          Avbryt
                        </Button>
                        <Button onClick={handleAddSection}>
                          Lägg till
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* Navigation content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {sections.map((section) => {
              const IconComponent = getSectionIcon(section.title);
              const colorClasses = getSectionColor(section.title);
              const isExpanded = expandedSections.has(section.id);
              const hasPages = section.pages && section.pages.length > 0;
              const hasActivePages = hasPages && section.pages.some(page => isPageActive(page.id));

              return (
                <div key={section.id} className="space-y-1">
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleSectionExpansion(section.id)}
                  >
                    <div className="flex items-center space-x-1">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className={`
                            flex-1 justify-start h-auto p-3 text-left
                            hover:bg-gray-50 transition-colors duration-200
                            ${hasActivePages ? 'bg-blue-50 border border-blue-200' : ''}
                          `}
                          onClick={() => handleSectionClick(section.id)}
                        >
                          <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0
                            ${colorClasses}
                          `}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`
                              font-medium text-sm truncate
                              ${hasActivePages ? 'text-blue-900' : 'text-gray-900'}
                            `}>
                              {section.title}
                            </div>
                            {section.description && (
                              <div className="text-xs text-gray-500 truncate mt-1">
                                {section.description}
                              </div>
                            )}
                            {hasPages && (
                              <div className="flex items-center mt-1 space-x-2">
                                <Badge variant="secondary" className="text-xs">
                                  {section.pages.length} sidor
                                </Badge>
                              </div>
                            )}
                          </div>
                          {hasPages && (
                            <ChevronRight className={`
                              w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0
                              ${isExpanded ? 'rotate-90' : ''}
                            `} />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    {hasPages && (
                      <CollapsibleContent className="space-y-1">
                        <div className="ml-11 space-y-1">
                          {section.pages.map((page) => (
                            <Button
                              key={page.id}
                              variant="ghost"
                              className={`
                                w-full justify-start h-auto p-2 text-left text-sm
                                hover:bg-gray-50 transition-colors duration-200
                                ${isPageActive(page.id) 
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                  : 'text-gray-700'
                                }
                              `}
                              onClick={() => handlePageClick(page.id)}
                            >
                              <div className="flex items-center space-x-2 w-full min-w-0">
                                <div className={`
                                  w-2 h-2 rounded-full flex-shrink-0
                                  ${isPageActive(page.id) ? 'bg-blue-600' : 'bg-gray-300'}
                                `} />
                                <span className="truncate">{page.title}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </div>
              );
            })}

            {sections.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-4">
                  Inga sektioner än
                </p>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till sektion
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            <p>Digital handbok</p>
            <p className="mt-1">handbok.org</p>
          </div>
        </div>
      </aside>
    </>
  );
}; 