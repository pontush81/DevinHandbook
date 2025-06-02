import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HandbookSection as Section, HandbookPage as Page, Handbook } from '@/types/handbook';
import { Calendar, Clock, Edit3, Plus, Wrench, Phone, BookOpen, DollarSign, Zap, Search, MessageCircle, Users, X, Trash2, Minus, ChevronUp, ChevronDown, Eye, Heart, Recycle, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuickActionCard } from './QuickActionCard';
import { StatisticCard } from './StatisticCard';
import { InfoCard } from './InfoCard';
import { ContactCard } from './ContactCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import { getIconComponent } from '@/lib/icon-utils';
import { IconPicker } from '@/components/ui/IconPicker';

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
  
  // Local state for content editing to prevent cursor jumping
  const [localPageContent, setLocalPageContent] = useState<Record<string, string>>({});
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Initialize local content state when pages change
  useEffect(() => {
    const newLocalContent: Record<string, string> = {};
    sectionsArray.forEach(section => {
      section.pages?.forEach(page => {
        if (!(page.id in localPageContent)) {
          newLocalContent[page.id] = page.content || '';
        }
      });
    });
    if (Object.keys(newLocalContent).length > 0) {
      setLocalPageContent(prev => ({ ...prev, ...newLocalContent }));
    }
  }, [sectionsArray]);

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

  // Helper function to add a new page to a section
  const handleAddPage = async (sectionId: string, title: string = 'Ny sida') => {
    console.log('🔄 [ContentArea] Adding new page to section:', { sectionId, title });
    
    try {
      if (onAddPage) {
        await onAddPage(sectionId, { title, content: '', order: 0 });
        console.log('✅ [ContentArea] Page added successfully');
      } else {
        const errorMsg = 'onAddPage callback not provided';
        console.error('❌ [ContentArea]', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error('❌ [ContentArea] Error adding page:', {
        error: errorMsg,
        sectionId,
        title,
        stack: error.stack
      });
      // Show user-friendly error message
      alert(`❌ Fel vid tillägg av sida: ${errorMsg}`);
      throw error; // Re-throw for any calling code
    }
  };

  // Auto-save section changes with better error handling
  const handleSectionChange = async (sectionId: string, updates: Partial<Section>) => {
    console.log('🔄 [ContentArea] Auto-saving section change:', { sectionId, updates });
    console.log('📋 [ContentArea] Current sections in state:', sectionsArray.map(s => ({ id: s.id, title: s.title })));
    
    try {
      const response = await fetch(`/api/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      let errorData: any = null;
      let responseText = '';
      try {
        responseText = await response.text();
        if (responseText) {
          errorData = JSON.parse(responseText);
        }
      } catch {
        errorData = { error: responseText };
      }

      if (!response.ok) {
        const errorDetails = errorData?.details || errorData?.error || responseText || 'Unknown error';
        console.error('❌ [ContentArea] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          sectionId,
          updates,
          errorData,
          responseText
        });
        
        if (response.status === 404) {
          console.error('🔍 [ContentArea] Section not found in database:', sectionId);
          console.error('🔍 [ContentArea] This suggests the section exists in frontend state but not in database');
          console.error('🔍 [ContentArea] Available sections in current state:', sectionsArray.map(s => ({ id: s.id, title: s.title })));
          alert('❌ Fel: Sektionen hittades inte i databasen. Den kanske inte sparades korrekt vid skapandet. Försök att ladda om sidan.');
        } else {
          alert(`❌ Fel vid sparning av sektion: ${errorDetails}`);
        }
        
        throw new Error(`Failed to update section: ${response.status} ${response.statusText} - ${errorDetails}`);
      }

      const updatedSection = errorData || {};
      console.log('✅ [ContentArea] Section updated successfully:', updatedSection);

      // Update parent through callback
      if (onUpdateSection) {
        console.log('🔄 [ContentArea] Calling onUpdateSection callback');
        await onUpdateSection(sectionId, updates);
        console.log('✅ [ContentArea] onUpdateSection callback completed');
      } else {
        console.warn('⚠️ [ContentArea] No onUpdateSection callback available');
      }

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error('❌ [ContentArea] Error auto-saving section:', {
        error: errorMsg,
        sectionId,
        updates,
        stack: error.stack,
        availableSections: sectionsArray.map(s => ({ id: s.id, title: s.title }))
      });
      
      // Update local state optimistically even if API call failed
      console.log('🔄 [ContentArea] Attempting optimistic local update despite API failure...');
      if (onUpdateSection) {
        try {
          await onUpdateSection(sectionId, updates);
          console.log('✅ [ContentArea] Local state updated optimistically');
        } catch (localError) {
          console.error('❌ [ContentArea] Failed to update local state:', localError);
        }
      }
      
      throw new Error(`Error auto-saving section: ${errorMsg}`);
    }
  };

  // Auto-save page content directly to database with debouncing
  const handleContentChange = useCallback(async (pageId: string, content: string) => {
    console.log('🔄 [ContentArea] Auto-saving page content:', pageId);
    
    // Clear existing timeout
    if (saveTimeouts.current[pageId]) {
      clearTimeout(saveTimeouts.current[pageId]);
      delete saveTimeouts.current[pageId];
    }
    
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
      // Revert local content to last saved state
      const page = sectionsArray.flatMap(s => s.pages || []).find(p => p.id === pageId);
      if (page) {
        setLocalPageContent(prev => ({ ...prev, [pageId]: page.content || '' }));
      }
      alert('❌ Fel vid sparning av sida. Innehållet har återställts.');
    }
  }, [sectionsArray, onUpdatePage]);

  // Debounced content change handler
  const handleLocalContentChange = useCallback((pageId: string, newContent: string) => {
    // Update local state immediately for smooth typing
    setLocalPageContent(prev => ({ ...prev, [pageId]: newContent }));
    
    // Clear existing timeout
    if (saveTimeouts.current[pageId]) {
      clearTimeout(saveTimeouts.current[pageId]);
    }
    
    // Set new timeout for auto-save
    saveTimeouts.current[pageId] = setTimeout(() => {
      handleContentChange(pageId, newContent);
    }, 1500); // 1.5 second delay
  }, [handleContentChange]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Update local content when a page is selected to ensure sync
  useEffect(() => {
    if (selectedPageId) {
      const page = sectionsArray.flatMap(s => s.pages || []).find(p => p.id === selectedPageId);
      if (page && localPageContent[selectedPageId] !== page.content) {
        setLocalPageContent(prev => ({ ...prev, [selectedPageId]: page.content || '' }));
      }
    }
  }, [selectedPageId, sectionsArray]);

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

  // Get page content (prefer local state for smooth editing)
  const getPageContent = (page: Page): string => {
    return localPageContent[page.id] !== undefined ? localPageContent[page.id] : (page.content || '');
  };

  // Create new section
  const handleCreateSection = async (title: string, description: string, icon: string) => {
    console.log('🔄 [ContentArea] Creating new section:', { title, description, icon, handbookId });
    
    try {
      const sectionData = {
        title,
        description,
        icon,
        handbook_id: handbookId,
        order_index: sectionsArray.length,
        is_public: true,
        is_published: true
      };

      console.log('📤 [ContentArea] Sending section data:', sectionData);

      const response = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionData)
      });

      const responseText = await response.text();
      console.log('📥 [ContentArea] Raw API response:', { status: response.status, text: responseText });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorData = JSON.parse(responseText);
          errorDetails = errorData.details || errorData.error || responseText;
        } catch {
          errorDetails = responseText;
        }
        throw new Error(`API Error ${response.status}: ${errorDetails}`);
      }

      const newSection = JSON.parse(responseText);
      console.log('✅ [ContentArea] Section created successfully in database:', newSection);

      // Validate that the section has an ID (proving it was saved to database)
      if (!newSection.id) {
        throw new Error('Created section is missing ID - database save may have failed');
      }

      // Ensure the section has proper structure with pages array
      const completedSection = {
        ...newSection,
        pages: newSection.pages || [], // Ensure pages array exists
        is_public: newSection.is_public !== undefined ? newSection.is_public : true,
        is_published: newSection.is_published !== undefined ? newSection.is_published : true
      };

      console.log('📤 [ContentArea] Prepared section for state update:', completedSection);

      // Update parent state through callback
      if (onAddSection) {
        console.log('🔄 [ContentArea] Calling onAddSection callback with:', completedSection);
        await onAddSection(completedSection);
        console.log('✅ [ContentArea] onAddSection callback completed successfully');
        
        // Verify the section was added by checking if we can find it after a small delay
        setTimeout(() => {
          const foundSection = sectionsArray.find(s => s.id === newSection.id);
          if (foundSection) {
            console.log('✅ [ContentArea] Section verification: Found in local state:', foundSection.id);
          } else {
            console.error('❌ [ContentArea] Section verification: NOT found in local state after adding. Available sections:', 
              sectionsArray.map(s => ({ id: s.id, title: s.title })));
          }
        }, 500);
      } else {
        console.error('❌ [ContentArea] No onAddSection callback available - section cannot be added to state');
        throw new Error('No onAddSection callback available');
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ [ContentArea] Error creating section:', {
        error: errorMsg,
        title,
        description,
        icon,
        handbookId,
        stack: error instanceof Error ? error.stack : undefined
      });
      alert(`❌ Fel vid skapande av sektion: ${errorMsg}`);
      throw error; // Re-throw for any parent error handling
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

  return (
    <div className="content-area-scroll">
      {/* If we have a current page, show just that page */}
      {currentPage ? (
        <div className="w-full h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                  {currentPage.title}
                </CardTitle>
                {currentPage.lastUpdated && (
                  <CardDescription className="flex items-center text-gray-500 mt-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    Senast uppdaterad: {currentPage.lastUpdated}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="prose prose-blue max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: currentPage.content }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // Show all sections in overview mode with proper spacing
        <div className="w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-full">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
            {sections.map((section, sectionIndex) => (
              <section 
                key={section.id} 
                id={`section-${section.id}`}
                className={`mb-8 sm:mb-12 last:mb-0 ${sectionIndex === 0 ? 'mt-0' : ''}`}
              >
                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-4 sm:pb-6">
                    <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                      {section.title}
                    </CardTitle>
                    {section.description && (
                      <CardDescription className="text-base sm:text-lg text-gray-600 mt-2">
                        {section.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 space-y-6 sm:space-y-8">
                    {section.pages.map((page, pageIndex) => (
                      <article 
                        key={page.id} 
                        className={`${pageIndex > 0 ? 'border-t pt-6 sm:pt-8' : ''}`}
                      >
                        {section.pages.length > 1 && (
                          <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
                            {page.title}
                          </h3>
                        )}
                        
                        <div className="prose prose-blue max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: page.content }} />
                        </div>
                        
                        {page.lastUpdated && (
                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              Senast uppdaterad: {page.lastUpdated}
                            </div>
                            {page.estimatedReadTime && (
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                {page.estimatedReadTime} min läsning
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 