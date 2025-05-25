import React, { useState } from 'react';
import { X, Home, Users, AlertTriangle, DollarSign, FileText, Building, Wrench, Trash2, Car, Shirt, MapPin, HelpCircle, Archive, Shield, Calendar, Plus, Edit3, Settings } from 'lucide-react';
import { HandbookSection } from '../../types/handbook';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SidebarProps {
  sections: HandbookSection[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  showMobileHeader?: boolean;
  isEditMode?: boolean;
  onAddSection?: (title: string, description?: string) => void;
  onUpdateSection?: (sectionId: string, updates: { title?: string; description?: string }) => void;
}

const getSectionIcon = (title: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    'Välkommen': Home,
    'Kontaktuppgifter och styrelse': Users,
    'Felanmälan': AlertTriangle,
    'Ekonomi och avgifter': DollarSign,
    'Stadgar och årsredovisning': FileText,
    'Renoveringar och underhåll': Building,
    'Bopärmar och regler': Wrench,
    'Sopsortering och återvinning': Trash2,
    'Parkering och garage': Car,
    'Tvättstuga och bokningssystem': Shirt,
    'Gemensamma utrymmen': MapPin,
    'Vanliga frågor (FAQ)': HelpCircle,
    'Dokumentarkiv': Archive,
    'Säkerhet och trygghet': Shield,
    'Viktiga datum': Calendar
  };
  
  return iconMap[title] || FileText;
};

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  currentPageId,
  onPageSelect,
  isOpen,
  onClose,
  showMobileHeader = true,
  isEditMode = false,
  onAddSection,
  onUpdateSection
}) => {
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState('');
  const [editSectionDescription, setEditSectionDescription] = useState('');

  const handleSectionClick = (sectionId: string) => {
    // Don't navigate if we're in edit mode and clicking the edit button
    if (isEditMode) return;
    
    // Scroll to the section
    const sectionElement = document.getElementById(`section-${sectionId}`);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Only close sidebar on mobile
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleAddSection = () => {
    if (newSectionTitle.trim() && onAddSection) {
      onAddSection(newSectionTitle.trim(), newSectionDescription.trim());
      setNewSectionTitle('');
      setNewSectionDescription('');
      setShowAddSectionDialog(false);
    }
  };

  const handleEditSection = (section: HandbookSection) => {
    setEditingSectionId(section.id);
    setEditSectionTitle(section.title);
    setEditSectionDescription(section.description || '');
  };

  const handleUpdateSection = () => {
    if (editingSectionId && editSectionTitle.trim() && onUpdateSection) {
      onUpdateSection(editingSectionId, {
        title: editSectionTitle.trim(),
        description: editSectionDescription.trim()
      });
      setEditingSectionId(null);
      setEditSectionTitle('');
      setEditSectionDescription('');
    }
  };

  const handleCancelEdit = () => {
    setEditingSectionId(null);
    setEditSectionTitle('');
    setEditSectionDescription('');
  };

  return (
    <>
      {/* Mobile overlay - only show on mobile when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        w-80 bg-white border-r border-gray-200 z-50
        lg:relative lg:h-auto
        fixed lg:static top-0 left-0 h-full
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header - only show on mobile */}
        {showMobileHeader && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Innehållsförteckning</h2>
          </div>
        )}

        {/* Content */}
        <div className="p-4 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide hidden lg:block">
              Innehållsförteckning
            </h3>
            
            {/* Add section button in edit mode */}
            {isEditMode && onAddSection && (
              <Dialog open={showAddSectionDialog} onOpenChange={setShowAddSectionDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
                    <Plus className="w-3 h-3" />
                    <span className="hidden lg:inline">Ny sektion</span>
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
                    <div>
                      <label className="text-sm font-medium text-gray-700">Titel</label>
                      <Input
                        placeholder="Sektionsnamn"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Beskrivning (valfritt)</label>
                      <Input
                        placeholder="Kort beskrivning av sektionen"
                        value={newSectionDescription}
                        onChange={(e) => setNewSectionDescription(e.target.value)}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleAddSection} disabled={!newSectionTitle.trim()}>
                        Skapa sektion
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddSectionDialog(false)}>
                        Avbryt
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          <nav className="space-y-2">
            {sections.map((section, index) => {
              const IconComponent = getSectionIcon(section.title);
              
              return (
                <div key={section.id} className="relative group">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSectionClick(section.id)}
                      className="flex-1 flex items-center space-x-3 px-3 py-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <IconComponent className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-400">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {section.title}
                          </h4>
                        </div>
                        {section.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {section.description}
                          </p>
                        )}
                      </div>
                    </button>
                    
                    {/* Edit button - visible in edit mode */}
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSection(section);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
                        title="Redigera sektion"
                      >
                        <Settings className="w-4 h-4 text-gray-500" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Edit Section Dialog */}
          <Dialog open={!!editingSectionId} onOpenChange={(open) => !open && handleCancelEdit()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Redigera sektion</DialogTitle>
                <DialogDescription>
                  Uppdatera sektionens titel och beskrivning
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Titel</label>
                  <Input
                    placeholder="Sektionsnamn"
                    value={editSectionTitle}
                    onChange={(e) => setEditSectionTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Beskrivning (valfritt)</label>
                  <Input
                    placeholder="Kort beskrivning av sektionen"
                    value={editSectionDescription}
                    onChange={(e) => setEditSectionDescription(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleUpdateSection} disabled={!editSectionTitle.trim()}>
                    Uppdatera sektion
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Avbryt
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add section prompt in edit mode when no sections */}
          {isEditMode && sections.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm mb-4">Inga sektioner än</p>
              <Button onClick={() => setShowAddSectionDialog(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Lägg till första sektionen
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}; 