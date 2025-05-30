import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HandbookSection as Section, HandbookPage as Page, Handbook } from '@/types/handbook';
import { Calendar, Clock, Edit3, Plus, Wrench, Phone, BookOpen, DollarSign, Zap, Search, MessageCircle, Users, X, Trash2, Minus, Bold, Italic, List, ListOrdered, Quote, Code, Link2, Image, ChevronUp, ChevronDown, Eye, Heart, Recycle, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuickActionCard } from './QuickActionCard';
import { StatisticCard } from './StatisticCard';
import { InfoCard } from './InfoCard';
import { ContactCard } from './ContactCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  WelcomeContentData, 
  getWelcomeContent, 
  upsertWelcomeContent, 
  getDefaultWelcomeContent 
} from '@/lib/services/welcomeContentService';
import TextareaAutosize from 'react-textarea-autosize';
import { useDebouncedCallback } from 'use-debounce';
import { getIconComponent } from '@/lib/icon-utils';
import { IconPicker } from '@/components/ui/IconPicker';
import debounce from 'lodash/debounce';

interface ContentAreaProps {
  sections: Section[];
  currentPageId?: string;
  isEditMode?: boolean;
  handbookId: string;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onUpdatePage?: (pageId: string, updates: Partial<Page>) => void;
  onAddPage?: (sectionId: string, page: Partial<Page>) => void;
  onDeletePage?: (pageId: string) => void;
  onAddSection?: (section: Partial<Section>) => void;
  onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void;
  onDeleteSection?: (sectionId: string) => void;
  onExitEditMode?: () => void;
}

interface EditableWelcomeContentProps {
  data: WelcomeContentData;
  isEditMode: boolean;
  onUpdate?: (data: WelcomeContentData) => void;
}

const EditableWelcomeContent: React.FC<EditableWelcomeContentProps> = ({ 
  data, 
  isEditMode, 
  onUpdate 
}) => {
  const [editData, setEditData] = useState<WelcomeContentData>(data);

  const updateData = (updates: Partial<WelcomeContentData>) => {
    const newData = { ...editData, ...updates };
    setEditData(newData);
    onUpdate?.(newData);
  };

  const getIconComponent = (iconName: string, className: string) => {
    const iconMap: Record<string, any> = {
      BookOpen, Phone, Wrench, DollarSign, Clock, Search, MessageCircle, Users, Zap, Bold, Italic, List, ListOrdered, Quote, Code, Link2, Image, Heart, Recycle, Car
    };
    const IconComponent = iconMap[iconName] || BookOpen;
    return <IconComponent className={className} />;
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
      green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
      orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
      purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
      yellow: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200" },
      red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="space-y-8">
      {/* Professional Hero Section - matching landing page style */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>
        <div className="relative px-6 py-16 lg:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {isEditMode ? (
              <div className="space-y-6">
                <input
                  type="text"
                  value={editData.heroTitle}
                  onChange={(e) => updateData({ heroTitle: e.target.value })}
                  className="text-3xl lg:text-5xl font-bold text-gray-900 w-full bg-transparent border-2 border-dashed border-gray-300 rounded-lg p-4 text-center focus:outline-none focus:border-blue-500"
                  placeholder="Huvudrubrik"
                />
                <textarea
                  value={editData.heroSubtitle}
                  onChange={(e) => updateData({ heroSubtitle: e.target.value })}
                  className="text-lg text-gray-600 w-full bg-transparent border-2 border-dashed border-gray-300 rounded-lg p-4 text-center resize-y min-h-[100px] focus:outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Underrubrik"
                />
              </div>
            ) : (
              <>
                <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                  {editData.heroTitle}
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
                  {editData.heroSubtitle}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

interface RobustTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  pageId: string;
}

const RobustTextarea: React.FC<RobustTextareaProps> = ({ 
  value, 
  onChange, 
  placeholder = "Skriv ditt innehåll här...", 
  className = "",
  minRows = 10,
  pageId
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  // Debounced auto-save function
  const debouncedSave = useMemo(
    () => debounce(async (newValue: string) => {
      if (newValue !== value) {
        setIsSaving(true);
        try {
          await onChange(newValue);
        } catch (error) {
          console.error('Error auto-saving:', error);
        } finally {
          setIsSaving(false);
        }
      }
    }, 1000),
    [onChange, value]
  );

  // Update local value when props change
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = (minRows * 20) + 12; // Approximate line height + padding
      textarea.style.height = Math.max(scrollHeight, minHeight) + 'px';
    }
  }, [minRows]);

  // Adjust height when content changes
  useEffect(() => {
    adjustHeight();
  }, [localValue, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedSave(newValue);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg px-4 py-3 text-sm sm:text-base leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
        style={{ minHeight: `${(minRows * 20) + 12}px` }}
      />
      {isSaving && (
        <div className="absolute bottom-2 right-2 text-xs text-blue-600 bg-white px-2 py-1 rounded shadow">
          💾 Sparar automatiskt...
        </div>
      )}
    </div>
  );
};

// Helper function for default welcome content
const getWelcomeContent = () => ({
  title: "Välkommen!",
  subtitle: "Din digitala handbok",
  description: "Detta är en modern, interaktiv handbok som gör det enkelt att hitta information."
});

// Helper function to get section icon
const getSectionIcon = (section: Section) => {
  return getIconComponent(section.icon);
};

// Markdown Toolbar Component
interface MarkdownToolbarProps {
  onInsert: (text: string, cursorOffset?: number) => void;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onInsert }) => {
  const buttons = [
    { icon: Bold, label: 'Fet', format: '**text**', offset: 2 },
    { icon: Italic, label: 'Kursiv', format: '*text*', offset: 1 },
    { icon: List, label: 'Lista', format: '- ', offset: 0 },
    { icon: ListOrdered, label: 'Numrerad', format: '1. ', offset: 0 },
    { icon: Quote, label: 'Citat', format: '> ', offset: 0 },
    { icon: Code, label: 'Kod', format: '`kod`', offset: 1 },
    { icon: Link2, label: 'Länk', format: '[länktext](url)', offset: 5 },
    { icon: Image, label: 'Bild', format: '![alt text](url)', offset: 5 },
  ];

  return (
    <>
      {buttons.map((btn, index) => {
        const IconComponent = btn.icon;
        return (
          <Button
            key={btn.label}
            variant="ghost"
            size="sm"
            onClick={() => onInsert(btn.format, btn.offset)}
            className="h-9 w-full sm:w-auto sm:h-8 p-2 sm:px-3 flex items-center justify-center sm:justify-start gap-1 sm:gap-2 text-xs hover:bg-blue-100 hover:text-blue-700 transition-colors"
            title={btn.label}
          >
            <IconComponent className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline text-xs font-medium">{btn.label}</span>
          </Button>
        );
      })}
    </>
  );
};

// Inline Section Creator Component
interface InlineSectionCreatorProps {
  onCreateSection: (title: string, description: string, icon: string) => void;
  insertIndex?: number;
  placeholder?: string;
}

const InlineSectionCreator: React.FC<InlineSectionCreatorProps> = ({ 
  onCreateSection, 
  insertIndex = 0,
  placeholder = "Lägg till ny sektion"
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('BookOpen');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreateSection(title.trim(), description.trim(), selectedIcon);
      setTitle('');
      setDescription('');
      setSelectedIcon('BookOpen');
      setIsExpanded(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setSelectedIcon('BookOpen');
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(true)}
        className="border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-colors space-x-2 h-10 sm:h-12 px-4 sm:px-6 text-sm text-blue-700 w-full"
      >
        <Plus className="w-4 h-4" />
        <span>{placeholder}</span>
      </Button>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Sektionsrubrik"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold"
              autoFocus
            />
          </div>
          
          <div>
            <Textarea
              placeholder="Beskrivning (valfritt)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Välj ikon:
            </label>
            <IconPicker
              selectedIcon={selectedIcon}
              onIconSelect={setSelectedIcon}
              compact={true}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              size="sm"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={!title.trim()}
              size="sm"
            >
              Skapa sektion
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export function ContentArea({ sections, currentPageId, isEditMode = false, handbookId, onUpdateSection, onUpdatePage, onAddPage, onDeletePage, onAddSection, onMoveSection, onDeleteSection, onExitEditMode }: ContentAreaProps) {
  // Guard against undefined handbook
  if (!sections) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  // Ensure sections is always an array
  const sectionsArray = sections || [];
  
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    sectionsArray[0]?.id || null
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  // Use currentPageId from props instead of local state
  useEffect(() => {
    if (currentPageId) {
      // Find which section contains this page
      const foundSection = sectionsArray.find(section => 
        section.pages?.some(page => page.id === currentPageId)
      );
      if (foundSection) {
        setSelectedSectionId(foundSection.id);
        setSelectedPageId(currentPageId);
      }
    } else {
      setSelectedPageId(null);
    }
  }, [currentPageId, sectionsArray]);

  // Get the selected section
  const selectedSection = sectionsArray.find(s => s.id === selectedSectionId);
  
  // Get the selected page
  const selectedPage = selectedSection?.pages?.find(p => p.id === selectedPageId);

  // Auto-save section changes directly to database
  const handleSectionChange = async (sectionId: string, updates: Partial<Section>) => {
    console.log('🔄 [ContentArea] Auto-saving section change:', sectionId, updates);
    
    try {
      const response = await fetch(`/api/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update section: ${response.statusText}`);
      }

      const updatedSection = await response.json();
      console.log('✅ [ContentArea] Section auto-saved successfully:', updatedSection);

      // Update local state through callback
      if (onUpdateSection) {
        onUpdateSection(sectionId, updates);
      }
      
    } catch (error) {
      console.error('❌ [ContentArea] Error auto-saving section:', error);
      alert('❌ Fel vid sparning av sektion. Försök igen.');
    }
  };

  // Auto-save page content directly to database  
  const handleContentChange = async (pageId: string, content: string) => {
    console.log('🔄 [ContentArea] Auto-saving page content:', pageId);
    
    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error(`Failed to update page: ${response.statusText}`);
      }

      const updatedPage = await response.json();
      console.log('✅ [ContentArea] Page content auto-saved successfully:', updatedPage);

      // Update local state through callback
      if (onUpdatePage) {
        onUpdatePage(pageId, { content });
      }
      
    } catch (error) {
      console.error('❌ [ContentArea] Error auto-saving page content:', error);
      alert('❌ Fel vid sparning av sida. Försök igen.');
    }
  };

  // Auto-save page title directly to database
  const handlePageUpdate = async (pageId: string, updates: Partial<Page>) => {
    console.log('🔄 [ContentArea] Auto-saving page update:', pageId, updates);
    
    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update page: ${response.statusText}`);
      }

      const updatedPage = await response.json();
      console.log('✅ [ContentArea] Page auto-saved successfully:', updatedPage);

      // Update local state through callback
      if (onUpdatePage) {
        onUpdatePage(pageId, updates);
      }
      
    } catch (error) {
      console.error('❌ [ContentArea] Error auto-saving page:', error);
      alert('❌ Fel vid sparning av sida. Försök igen.');
    }
  };

  // Get page content
  const getPageContent = (page: Page): string => {
    return page.content || '';
  };

  // Create new section
  const handleCreateSection = async (title: string, description: string, icon: string) => {
    console.log('🔄 [ContentArea] Creating new section:', { title, description, icon });
    
    try {
      const response = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          icon,
          handbook_id: handbookId,
          order_index: sectionsArray.length
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create section: ${response.statusText}`);
      }

      const newSection = await response.json();
      console.log('✅ [ContentArea] Section created successfully:', newSection);

      // Update local state through callback
      if (onAddSection) {
        onAddSection(newSection);
      }
      
    } catch (error) {
      console.error('❌ [ContentArea] Error creating section:', error);
      alert('❌ Fel vid skapande av sektion. Försök igen.');
    }
  };

  // Debug logging
  console.log('[ContentArea] Received props:', {
    sectionsCount: sectionsArray.length,
    currentPageId: selectedPageId,
    isEditMode,
    handbookId,
    sections: sectionsArray.map(s => ({ id: s.id, title: s.title, pagesCount: s.pages?.length || 0 }))
  });

  // Find current page if specified
  const currentPage = currentPageId ? 
    sectionsArray.flatMap(s => s.pages || []).find(p => p.id === currentPageId) : 
    null;

  console.log('[ContentArea] Current page lookup:', {
    currentPageId,
    found: !!currentPage,
    currentPage: currentPage ? { id: currentPage.id, title: currentPage.title } : null
  });

  // If we have a current page, show just that page
  if (currentPage) {
    return (
      <div className="w-full h-full content-area-scroll bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                {currentPage.title}
              </CardTitle>
              {currentPage.lastUpdated && (
                <CardDescription className="flex items-center text-gray-500 mt-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  Uppdaterad {currentPage.lastUpdated}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="prose prose-lg max-w-none">
                <MarkdownRenderer content={currentPage.content || ''} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show all sections as a long scrollable page
  return (
    <div className="w-full h-full content-area-scroll bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Fixed/Sticky Exit Edit Mode Button - Float over content when in edit mode */}
      {isEditMode && onExitEditMode && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          {/* Auto-save info button */}
          <Button
            onClick={() => {
              console.log('💾 Auto-save aktiverat - inga ändringar behöver sparas manuellt');
              alert('✅ Alla ändringar sparas automatiskt! Du behöver inte göra något mer.');
            }}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            💾 Allt sparas automatiskt
          </Button>
          
          {/* Exit edit mode button - More prominent */}
          <Button
            onClick={() => {
              console.log('🚪 Avslutar redigeringsläge');
              onExitEditMode();
            }}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Avsluta redigering
          </Button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Welcome content - only show when no sections exist at all */}
        {(!sectionsArray || sectionsArray.length === 0) && !currentPageId && (
          <div className="mb-8 sm:mb-16">
            <EditableWelcomeContent data={getWelcomeContent()} isEditMode={isEditMode} />
            
            {/* Add section button when no sections exist */}
            {isEditMode && (
              <div className="mt-8">
                <InlineSectionCreator 
                  onCreateSection={handleCreateSection}
                  placeholder="Skapa första sektionen"
                />
              </div>
            )}
          </div>
        )}

        {/* All sections displayed vertically */}
        {sectionsArray && sectionsArray.length > 0 && (
          <div className="space-y-8 sm:space-y-12">
            {/* Add section button before first section */}
            {isEditMode && (
              <section className="mb-8 sm:mb-16">
                <InlineSectionCreator 
                  onCreateSection={handleCreateSection}
                />
              </section>
            )}

            {/* All handbook sections */}
            {sectionsArray.map((section, sectionIndex) => {
              const IconComponent = getSectionIcon(section);
              
              return (
                <section key={section.id} className="mb-8 sm:mb-12">
                  <Card 
                    id={`section-${section.id}`}
                    className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white/90 backdrop-blur-sm overflow-hidden group"
                  >
                    {/* Beautiful gradient header */}
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-blue-100/50">
                      <CardHeader className="pb-4 sm:pb-6">
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                              <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {isEditMode ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <InlineEdit
                                      value={section.title}
                                      onSave={(newTitle) => handleSectionChange(section.id, { title: newTitle })}
                                      className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900"
                                      placeholder="Sektionsrubrik"
                                    />
                                  </div>
                                  <InlineEdit
                                    value={section.description || ''}
                                    onSave={(newDescription) => handleSectionChange(section.id, { description: newDescription })}
                                    className="text-sm sm:text-base text-gray-600"
                                    placeholder="Beskrivning av sektionen"
                                  />
                                  <div className="mt-3 p-3 bg-white/70 rounded-lg border border-blue-200">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                      🎨 Välj ikon för sektionen:
                                    </label>
                                    <IconPicker
                                      selectedIcon={section.icon || 'BookOpen'}
                                      onIconSelect={(icon) => {
                                        console.log('🎯 Icon selected:', icon, 'for section:', section.id);
                                        handleSectionChange(section.id, { icon });
                                      }}
                                      compact={true}
                                      size="sm"
                                    />
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`section-public-${section.id}`}
                                        checked={section.is_public !== false}
                                        onChange={(e) => handleSectionChange(section.id, { is_public: e.target.checked })}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <label 
                                        htmlFor={`section-public-${section.id}`}
                                        className="text-sm text-gray-700 cursor-pointer font-medium"
                                      >
                                        Publik sektion
                                      </label>
                                      <span className="text-xs text-gray-500">
                                        (Synlig för alla användare)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 leading-tight">
                                    {section.title}
                                  </CardTitle>
                                  {section.description && (
                                    <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                      {section.description}
                                    </CardDescription>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Section controls - mobile optimized */}
                          {isEditMode && (
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
                              {sectionIndex > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onMoveSection && onMoveSection(section.id, 'up')}
                                  className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                                  title="Flytta upp"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                              )}
                              {sectionIndex < sectionsArray.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onMoveSection && onMoveSection(section.id, 'down')}
                                  className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                                  title="Flytta ner"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSectionChange(section.id, { is_public: !section.is_public })}
                                className="h-8 w-8 p-0 hover:bg-yellow-100 text-yellow-600"
                                title={section.is_public ? "Göm sektion" : "Visa sektion"}
                              >
                                {section.is_public ? <Eye className="w-4 h-4" /> : <X className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteSection && onDeleteSection(section.id)}
                                className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                                title="Ta bort sektion"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </div>

                    <CardContent className="pt-6 sm:pt-8">
                      {/* Pages in this section */}
                      {section.pages && section.pages.length > 0 ? (
                        <div className="space-y-6 sm:space-y-8">
                          {section.pages.map((page, pageIndex) => (
                            <div key={page.id} className="border-l-2 border-blue-200 pl-4 sm:pl-6">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                                <div className="flex-1">
                                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex-1">
                                    {isEditMode ? (
                                      <InlineEdit
                                        value={page.title}
                                        onSave={(newTitle) => handlePageUpdate(page.id, { title: newTitle })}
                                        className="text-lg sm:text-xl font-semibold"
                                        placeholder="Skriv sidtitel..."
                                      />
                                    ) : (
                                      page.title
                                    )}
                                  </h3>
                                </div>
                              </div>

                              <div className="mb-4 sm:mb-6">
                                {isEditMode ? (
                                  <RobustTextarea
                                    value={getPageContent(page)}
                                    onChange={(newContent) => handleContentChange(page.id, newContent)}
                                    placeholder="Skriv ditt innehåll här... Du kan använda Markdown för formatering."
                                    className="min-h-32 sm:min-h-40"
                                    pageId={page.id}
                                  />
                                ) : (
                                  <MarkdownRenderer content={getPageContent(page)} />
                                )}
                              </div>

                              {isEditMode && (
                                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 pt-2 border-t border-gray-100">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePageUpdate(page.id, { order: page.order - 1 })}
                                    className="h-8 px-2 sm:px-3 text-gray-600 hover:text-gray-800 justify-start sm:justify-center"
                                    title="Flytta upp sida"
                                  >
                                    <ChevronUp className="w-4 h-4 mr-1 sm:mr-0" />
                                    <span className="sm:hidden">Flytta upp</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePageUpdate(page.id, { order: page.order + 1 })}
                                    className="h-8 px-2 sm:px-3 text-gray-600 hover:text-gray-800 justify-start sm:justify-center"
                                    title="Flytta ner sida"
                                  >
                                    <ChevronDown className="w-4 h-4 mr-1 sm:mr-0" />
                                    <span className="sm:hidden">Flytta ner</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePageUpdate(page.id, { is_public: !page.is_public })}
                                    className="h-8 px-2 sm:px-3 text-gray-600 hover:text-gray-800 justify-start sm:justify-center"
                                    title={page.is_public ? "Göm sida" : "Visa sida"}
                                  >
                                    {page.is_public ? <X className="w-4 h-4 mr-1 sm:mr-0" /> : <Eye className="w-4 h-4 mr-1 sm:mr-0" />}
                                    <span className="sm:hidden">{page.is_public ? "Göm" : "Visa"}</span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Empty section state */
                        <div className="text-center py-12 sm:py-16 text-gray-500">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                            <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                          </div>
                          <p className="text-sm sm:text-base mb-4 sm:mb-6 font-medium">Denna sektion har inga sidor än</p>
                          {isEditMode && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSectionChange(section.id, { pages: [{ id: '', title: 'Första sidan', content: '' }] })}
                              className="space-x-2 h-9 sm:h-10 px-4 sm:px-6 text-sm border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Lägg till första sidan</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 