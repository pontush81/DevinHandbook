import React, { useState, useEffect, useRef } from 'react';
import { HandbookSection as Section, HandbookPage as Page } from '@/types/handbook';
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

interface ContentAreaProps {
  sections: Section[];
  currentPageId?: string;
  isEditMode?: boolean;
  handbookId?: string;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onUpdatePage?: (pageId: string, updates: Partial<Page>) => void;
  onAddPage?: (sectionId: string, title: string, content?: string) => void;
  onAddSection?: (title: string, description: string, icon: string, insertIndex?: number) => void;
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

// Helper function to get section icon
const getSectionIcon = (section: Section) => {
  // Om sektionen har en specifik ikon vald, använd den
  if (section.icon) {
    return getIconComponent(section.icon);
  }
  
  // Annars, fallback till automatisk mappning baserat på titel
  const normalizedTitle = section.title.toLowerCase();
  
  if (normalizedTitle.includes('välkommen') || normalizedTitle.includes('hem')) {
    return BookOpen;
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
    return BookOpen;
  }
  if (normalizedTitle.includes('trivsel')) {
    return Heart;
  }
  if (normalizedTitle.includes('sopsortering') || normalizedTitle.includes('återvinning')) {
    return Recycle;
  }
  if (normalizedTitle.includes('parkering') || normalizedTitle.includes('garage')) {
    return Car;
  }
  if (normalizedTitle.includes('info') || normalizedTitle.includes('information')) {
    return Search;
  }
  if (normalizedTitle.includes('frågor') || normalizedTitle.includes('faq')) {
    return MessageCircle;
  }
  
  return BookOpen; // Default icon
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

// Robust Textarea Component with proper cursor handling
interface RobustTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  pageId: string;
  onSaveAndExit?: () => void;
}

const RobustTextarea: React.FC<RobustTextareaProps> = ({
  value,
  onChange,
  placeholder,
  className,
  pageId,
  onSaveAndExit
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Insert markdown function with scroll fix
  const insertMarkdown = (text: string, cursorOffset: number = 0) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Store scroll position before insertion
    const scrollTop = textarea.scrollTop;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let insertText = text;
    
    // Smart text replacement
    if (selectedText && text.includes('text')) {
      insertText = text.replace('text', selectedText);
    } else if (selectedText && text.includes('kod')) {
      insertText = text.replace('kod', selectedText);
    } else if (selectedText && text.includes('länktext')) {
      insertText = text.replace('länktext', selectedText);
    } else if (selectedText && text.includes('alt text')) {
      insertText = text.replace('alt text', selectedText);
    }
    
    const newValue = value.substring(0, start) + insertText + value.substring(end);
    const newCursorPos = start + insertText.length - cursorOffset;
    
    onChange(newValue);
    
    // Restore cursor and scroll position
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.scrollTop = scrollTop; // Restore scroll position
      }
    });
  };

  return (
    <div className="space-y-0">
      {/* Enhanced toolbar with mobile-optimized layout */}
      <div className="border border-gray-200 rounded-t-lg bg-gray-50 p-2 sm:p-3">
        {/* Top row: Preview toggle and toolbar toggle (mobile) */}
        <div className="flex items-center justify-between mb-2 sm:mb-0">
          <div className="flex items-center gap-2">
            <Button
              variant={isPreview ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className="h-9 px-3 text-xs sm:text-sm font-medium"
            >
              {isPreview ? (
                <>
                  <Edit3 className="w-4 h-4 mr-1" />
                  Redigera
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Förhandsgranska
                </>
              )}
            </Button>
            
            {/* Toolbar toggle for mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowToolbar(!showToolbar)}
              className="h-9 px-2 sm:hidden"
              title={showToolbar ? "Dölj verktygsfält" : "Visa verktygsfält"}
            >
              {showToolbar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Save buttons - always visible */}
          <div className="flex items-center gap-1 sm:gap-2">
            {onSaveAndExit && (
              <Button
                variant="default"
                size="sm"
                onClick={onSaveAndExit}
                className="h-9 px-2 sm:px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                <span className="hidden sm:inline">💾 Spara och avsluta</span>
                <span className="sm:hidden">✓</span>
              </Button>
            )}
          </div>
        </div>

        {/* Markdown toolbar - collapsible on mobile */}
        {!isPreview && (showToolbar || !isMobile) && (
          <div className="border-t border-gray-200 pt-2 mt-2 sm:border-t-0 sm:pt-0 sm:mt-0">
            <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1 sm:gap-2">
              <MarkdownToolbar onInsert={insertMarkdown} />
            </div>
            <div className="mt-2 text-xs text-gray-500 hidden sm:block">
              💡 Tips: Markera text först för att formatera den, eller klicka för att lägga till ny formatering
            </div>
          </div>
        )}
      </div>

      {/* Content area - either textarea or preview */}
      {isPreview ? (
        <div className={`
          min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm 
          rounded-t-none border-t-0 overflow-auto max-h-[70vh] sm:max-h-none
        `}>
          <div className="prose prose-gray max-w-none prose-sm sm:prose-base">
            <MarkdownRenderer content={value || '*Inget innehåll att förhandsgranska*'} />
          </div>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={isMobile ? 6 : 8}
          className={`
            flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm 
            ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none 
            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
            disabled:cursor-not-allowed disabled:opacity-50 resize-y
            ${className} rounded-t-none border-t-0
            sm:min-h-[250px] max-h-[70vh] sm:max-h-none
          `}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: isMobile ? '16px' : '14px',
            lineHeight: '1.5'
          }}
        />
      )}
    </div>
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

export const ContentArea: React.FC<ContentAreaProps> = ({
  sections,
  currentPageId,
  isEditMode = false,
  handbookId,
  onUpdateSection,
  onUpdatePage,
  onAddPage,
  onAddSection,
  onMoveSection,
  onDeleteSection,
  onExitEditMode
}) => {
  const [welcomeContent, setWelcomeContent] = useState<WelcomeContentData>(getDefaultWelcomeContent());
  const [localPageContent, setLocalPageContent] = useState<{ [pageId: string]: string }>({});
  const [saveStatus, setSaveStatus] = useState<{ [pageId: string]: 'saved' | 'saving' | 'unsaved' }>({});

  // Initialize local content when sections change
  useEffect(() => {
    const newContent: { [pageId: string]: string } = {};
    sections.forEach(section => {
      section.pages?.forEach(page => {
        if (!(page.id in localPageContent)) {
          newContent[page.id] = page.content || '';
        }
      });
    });
    if (Object.keys(newContent).length > 0) {
      setLocalPageContent(prev => ({ ...prev, ...newContent }));
    }
  }, [sections]);

  // Debounced update function with status tracking
  const debouncedUpdatePage = useDebouncedCallback(async (pageId: string, content: string) => {
    setSaveStatus(prev => ({ ...prev, [pageId]: 'saving' }));
    try {
      await onUpdatePage?.(pageId, { content });
      setSaveStatus(prev => ({ ...prev, [pageId]: 'saved' }));
    } catch (error) {
      setSaveStatus(prev => ({ ...prev, [pageId]: 'unsaved' }));
    }
  }, 500);

  // Handle content changes with local state
  const handleContentChange = (pageId: string, newContent: string) => {
    setLocalPageContent(prev => ({ ...prev, [pageId]: newContent }));
    setSaveStatus(prev => ({ ...prev, [pageId]: 'unsaved' }));
    debouncedUpdatePage(pageId, newContent);
  };

  // Manual save function
  const handleManualSave = async (pageId: string) => {
    const content = localPageContent[pageId];
    if (content !== undefined) {
      setSaveStatus(prev => ({ ...prev, [pageId]: 'saving' }));
      try {
        await onUpdatePage?.(pageId, { content });
        setSaveStatus(prev => ({ ...prev, [pageId]: 'saved' }));
      } catch (error) {
        setSaveStatus(prev => ({ ...prev, [pageId]: 'unsaved' }));
      }
    }
  };

  // Save and exit function
  const handleSaveAndExit = async (pageId: string) => {
    await handleManualSave(pageId);
    onExitEditMode?.();
  };

  // Get content for a page (local first, then fallback to page content)
  const getPageContent = (page: Page): string => {
    return localPageContent[page.id] ?? page.content ?? '';
  };

  // Get save status for a page
  const getSaveStatus = (pageId: string) => {
    return saveStatus[pageId] || 'saved';
  };

  // Debug logging
  console.log('[ContentArea] Received props:', {
    sectionsCount: sections?.length || 0,
    currentPageId,
    isEditMode,
    handbookId,
    sections: sections?.map(s => ({ id: s.id, title: s.title, pagesCount: s.pages?.length || 0 }))
  });

  // Find current page if specified
  const currentPage = currentPageId ? 
    sections.flatMap(s => s.pages || []).find(p => p.id === currentPageId) : 
    null;

  console.log('[ContentArea] Current page lookup:', {
    currentPageId,
    currentPage: currentPage ? `${currentPage.title} (${currentPage.id})` : 'None',
    allPages: sections.flatMap(s => s.pages || []).map(p => ({ id: p.id, title: p.title }))
  });

  // If a specific page is selected, show that page
  if (currentPage) {
    console.log('[ContentArea] Rendering individual page:', currentPage.title);
    const section = sections.find(s => s.pages?.some(p => p.id === currentPageId));
    
    return (
      <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-3 mb-4">
                <Badge variant="secondary" className="text-xs">
                  {section?.title}
                </Badge>
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900 leading-tight">
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
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Welcome content - only show when no sections exist at all */}
        {(!sections || sections.length === 0) && !currentPageId && (
          <div className="mb-8 sm:mb-16">
            <EditableWelcomeContent data={welcomeContent} isEditMode={isEditMode} />
          </div>
        )}

        {/* All sections displayed vertically */}
        {sections && sections.length > 0 && (
          <div className="space-y-8 sm:space-y-12">
            {/* Add section button before first section */}
            {isEditMode && onAddSection && (
              <section className="mb-8 sm:mb-16">
                <InlineSectionCreator 
                  onCreateSection={(title, description, icon) => onAddSection(title, description, icon, 0)}
                />
              </section>
            )}

            {/* All handbook sections */}
            {sections.map((section, sectionIndex) => {
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
                                <div className="space-y-2">
                                  <InlineEdit
                                    value={section.title}
                                    onSave={(newTitle) => onUpdateSection?.(section.id, { title: newTitle })}
                                    className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900"
                                    placeholder="Sektionsrubrik"
                                  />
                                  <InlineEdit
                                    value={section.description || ''}
                                    onSave={(newDescription) => onUpdateSection?.(section.id, { description: newDescription })}
                                    className="text-sm sm:text-base text-gray-600"
                                    placeholder="Beskrivning av sektionen"
                                  />
                                  <div className="mt-2">
                                    <label className="text-xs text-gray-500 mb-1 block">
                                      Ikon:
                                    </label>
                                    <IconPicker
                                      selectedIcon={section.icon || 'BookOpen'}
                                      onIconSelect={(icon) => onUpdateSection?.(section.id, { icon })}
                                      compact={true}
                                      size="sm"
                                    />
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
                              {onMoveSection && sectionIndex > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onMoveSection(section.id, 'up')}
                                  className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                                  title="Flytta upp"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                              )}
                              {onMoveSection && sectionIndex < sections.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onMoveSection(section.id, 'down')}
                                  className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                                  title="Flytta ner"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              )}
                              {onDeleteSection && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteSection(section.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                                  title="Ta bort sektion"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
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
                            <div key={page.id} className="relative">
                              {/* Page header */}
                              <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
                                <div className="flex-1 min-w-0">
                                  {isEditMode ? (
                                    <InlineEdit
                                      value={page.title}
                                      onSave={(newTitle) => onUpdatePage?.(page.id, { title: newTitle })}
                                      className="text-lg sm:text-xl font-semibold text-gray-800"
                                      placeholder="Sidtitel"
                                    />
                                  ) : (
                                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 leading-tight">
                                      {page.title}
                                    </h3>
                                  )}
                                  
                                  {/* Page metadata - mobile optimized */}
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                    {page.lastUpdated && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span>Uppdaterad {page.lastUpdated}</span>
                                      </div>
                                    )}
                                    {page.estimatedReadTime && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span>{page.estimatedReadTime} min läsning</span>
                                      </div>
                                    )}
                                    {getSaveStatus(page.id) !== 'saved' && (
                                      <Badge variant="secondary" className="text-xs">
                                        {getSaveStatus(page.id) === 'saving' ? 'Sparar...' : 'Osparad'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Page controls - mobile optimized */}
                                {isEditMode && onAddPage && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onAddPage(section.id, `Ny sida ${pageIndex + 2}`, '')}
                                    className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600 flex-shrink-0"
                                    title="Lägg till sida"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>

                              {/* Page content */}
                              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100/50 overflow-hidden shadow-sm">
                                {isEditMode ? (
                                  <div className="space-y-0">
                                    <RobustTextarea
                                      value={getPageContent(page)}
                                      onChange={(newValue) => handleContentChange(page.id, newValue)}
                                      placeholder="Skriv innehåll här... (Markdown stöds)"
                                      className="min-h-[200px] font-mono text-sm border-dashed border-gray-300 rounded-t-none border-t-0"
                                      pageId={page.id}
                                      onSaveAndExit={() => handleSaveAndExit(page.id)}
                                    />
                                  </div>
                                ) : (
                                  <div className="p-4 sm:p-6 lg:p-8">
                                    <div className="prose prose-gray max-w-none prose-sm sm:prose-base lg:prose-lg">
                                      <MarkdownRenderer content={getPageContent(page)} />
                                    </div>
                                  </div>
                                )}
                              </div>
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
                          {isEditMode && onAddPage && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onAddPage(section.id, 'Första sidan', '')}
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

                  {/* Add section button after each section */}
                  {isEditMode && onAddSection && (
                    <div className="mt-6 sm:mt-8">
                      <InlineSectionCreator 
                        onCreateSection={(title, description, icon) => onAddSection(title, description, icon, sectionIndex + 1)}
                        placeholder="Lägg till sektion här"
                      />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}; 