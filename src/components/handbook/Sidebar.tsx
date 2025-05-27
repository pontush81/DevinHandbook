import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Edit3
} from 'lucide-react';
import { HandbookSection } from '../../types/handbook';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createMenuFromSections, MenuItemConfig } from '@/lib/menu-generator';

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

  // Generate menu from sections using our intelligent system
  const menuGenerator = useMemo(() => {
    return createMenuFromSections(sections);
  }, [sections]);

  const menuItems = menuGenerator.getAllMenuItems();
  
  // Debug: Log menu items
  useEffect(() => {
    // Removed debug logging for cleaner console
  }, [menuItems]);

  const handleAddSection = () => {
    if (newSectionTitle.trim() && onAddSection) {
      onAddSection(newSectionTitle.trim());
      setNewSectionTitle('');
      setShowAddDialog(false);
    }
  };

  const handlePageClick = (item: MenuItemConfig) => {
    // Clear current page selection to show all sections
    onPageSelect('');
    
    // Close sidebar on mobile first
    if (window.innerWidth < 1024) {
      onClose();
    }
    
    // Wait a bit for the page to render, then scroll to section
    setTimeout(() => {
      const sectionElement = document.getElementById(`section-${item.section}`);
      if (sectionElement) {
        sectionElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const isItemActive = (item: MenuItemConfig): boolean => {
    const section = sections.find(s => s.id === item.section);
    if (section && section.pages) {
      return section.pages.some(page => page.id === currentPageId);
    }
    return item.section === currentPageId;
  };

  const getColorForSection = (title: string): string => {
    const normalizedTitle = title.toLowerCase()
      .replace(/[^a-zåäö\s]/g, '')
      .trim();
    
    // Color mapping for sections
    const colorMap: Record<string, string> = {
      'välkommen': '#3B82F6',
      'kontakt': '#10B981',
      'kontaktuppgifter': '#10B981',
      'styrelse': '#10B981',
      'felanmälan': '#F59E0B',
      'fel': '#F59E0B',
      'regler': '#6366F1',
      'bopärmar': '#6366F1',
      'sopsortering': '#059669',
      'återvinning': '#059669',
      'tvättstuga': '#06B6D4',
      'parkering': '#8B5CF6',
      'ekonomi': '#DC2626',
      'avgifter': '#DC2626',
      'stadgar': '#7C3AED',
      'årsredovisning': '#7C3AED',
      'renovering': '#EA580C',
      'underhåll': '#EA580C',
      'gemensamma': '#0891B2',
      'utrymmen': '#0891B2',
      'dokument': '#4B5563',
      'arkiv': '#4B5563',
      'säkerhet': '#DC2626',
      'faq': '#6B7280',
      'frågor': '#6B7280',
    };
    
    // Try exact match first
    if (colorMap[normalizedTitle]) {
      return colorMap[normalizedTitle];
    }
    
    // Try partial matches
    for (const [key, color] of Object.entries(colorMap)) {
      if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
        return color;
      }
    }
    
    return '#6B7280'; // Default gray
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="sidebar-overlay fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        sidebar-container
        fixed top-0 left-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        flex flex-col
      `}>
        {/* Mobile header */}
        {showMobileHeader && (
          <div className="lg:hidden p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Navigation</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors focus-visible"
                aria-label="Stäng navigation"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Navigation content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Icon style toggle - REMOVED for cleaner interface
          <div className="mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Vy:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => {}}
                  className={`px-2 py-1 rounded text-xs transition-colors focus-visible ${
                    iconStyle === 'minimal' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                  }`}
                  title="Minimala ikoner"
                  aria-label="Minimala ikoner"
                >
                  ●
                </button>
                <button
                  onClick={() => {}}
                  className={`px-2 py-1 rounded text-xs transition-colors focus-visible ${
                    iconStyle === 'hybrid' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                  }`}
                  title="Små ikoner"
                  aria-label="Små ikoner"
                >
                  🔸
                </button>
                <button
                  onClick={() => {}}
                  className={`px-2 py-1 rounded text-xs transition-colors focus-visible ${
                    iconStyle === 'emoji' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                  }`}
                  title="Emoji ikoner"
                  aria-label="Emoji ikoner"
                >
                  😊
                </button>
                <button
                  onClick={() => {}}
                  className={`px-2 py-1 rounded text-xs transition-colors focus-visible ${
                    iconStyle === 'none' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                  }`}
                  title="Ingen ikon"
                  aria-label="Ingen ikon"
                >
                  T
                </button>
              </div>
            </div>
          </div>
          */}

          {/* Navigation items */}
          <nav className="sidebar-nav space-y-1" role="navigation" aria-label="Huvudnavigation">
            {menuItems.map((item, index) => {
              const isActive = isItemActive(item);
              
              const renderIcon = () => {
                if (iconStyle === 'none') return null;
                
                if (iconStyle === 'minimal') {
                  const color = getColorForSection(item.title);
                  return (
                    <span 
                      className="nav-icon-minimal"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  );
                }
                
                if (iconStyle === 'hybrid') {
                  return (
                    <span className="nav-icon-hybrid" aria-hidden="true">
                      🔸
                    </span>
                  );
                }
                
                // emoji style
                return (
                  <span className="nav-icon-emoji" aria-hidden="true">
                    {item.emoji || '📄'}
                  </span>
                );
              };

              return (
                <button
                  key={`${item.section}-${index}`}
                  onClick={() => handlePageClick(item)}
                  className={`
                    nav-item w-full text-left transition-all duration-200 ease-in-out
                    focus-visible
                    ${isActive 
                      ? 'nav-item-active bg-blue-50 border-l-3 border-blue-500 text-blue-700' 
                      : 'nav-item-inactive text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${compactMode ? 'py-2' : 'py-3'}
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="nav-item-content flex items-center gap-3">
                    {renderIcon()}
                    <div className="flex-1 min-w-0">
                      <div className={`
                        nav-title font-medium truncate
                        ${isActive ? 'font-semibold' : ''}
                      `}>
                        {item.title}
                      </div>
                      {item.description && !compactMode && (
                        <div className="nav-description text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Add section button for editors */}
          {canEdit && onAddSection && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full button-responsive focus-visible"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Lägg till sektion</span>
                    <span className="sm:hidden">Lägg till</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="dialog-content">
                  <DialogHeader>
                    <DialogTitle>Lägg till ny sektion</DialogTitle>
                    <DialogDescription>
                      Skapa en ny sektion i handboken
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Sektionsrubrik</label>
                      <Input
                        placeholder="Ange sektionsrubrik"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        className="form-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddSection();
                          }
                        }}
                      />
                    </div>
                    <div className="button-group flex space-x-2">
                      <Button 
                        onClick={handleAddSection} 
                        disabled={!newSectionTitle.trim()}
                        className="button-responsive"
                      >
                        Skapa sektion
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAddDialog(false)}
                        className="button-responsive"
                      >
                        Avbryt
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}; 