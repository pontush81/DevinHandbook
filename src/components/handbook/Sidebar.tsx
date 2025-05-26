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
}

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  currentPageId,
  onPageSelect,
  isOpen,
  onClose,
  showMobileHeader = true,
  canEdit = false,
  onAddSection
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
    // Find the actual section
    const section = sections.find(s => s.id === item.section);
    
    if (section) {
      // If section has pages, navigate to first page
      if (section.pages && section.pages.length > 0) {
        onPageSelect(section.pages[0].id);
      } else {
        // If no pages, navigate to section itself
        onPageSelect(section.id);
      }
    } else {
      // Fallback: use the item section ID directly
      onPageSelect(item.section);
    }
    
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const isItemActive = (item: MenuItemConfig): boolean => {
    const section = sections.find(s => s.id === item.section);
    if (section && section.pages) {
      return section.pages.some(page => page.id === currentPageId);
    }
    return item.section === currentPageId;
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
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Navigation content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add section button for editors */}
          {canEdit && (
            <div className="mb-6">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till sektion
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Lägg till ny sektion</DialogTitle>
                    <DialogDescription>
                      Skapa en ny sektion i handboken
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Sektionsnamn"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAddSection} disabled={!newSectionTitle.trim()}>
                        Skapa
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Avbryt
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Navigation items - simple flat list */}
          <div className="nav-items">
            {menuItems.map((item) => {
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageClick(item)}
                  data-priority={item.priority}
                  className={`
                    nav-item
                    ${isItemActive(item) ? 'active' : ''}
                  `}
                >
                  <span className="nav-icon">
                    {item.icon}
                  </span>
                  <div className="nav-content">
                    <div className="nav-title">
                      {item.title}
                    </div>
                    {item.description && (
                      <div className="nav-description">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {isItemActive(item) && (
                    <div className="nav-indicator" />
                  )}
                </button>
              );
            })}

            {/* Empty state */}
            {menuItems.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-sm">Inga sektioner än</p>
                {canEdit && (
                  <p className="text-xs mt-2">Klicka på "Lägg till sektion" för att komma igång</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            <div className="flex items-center justify-center gap-2">
              <span>🏠</span>
              <span>Handbok.org</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}; 