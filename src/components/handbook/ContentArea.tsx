import React, { useState, useEffect, useRef } from 'react';
import { HandbookSection as Section, HandbookPage as Page } from '@/types/handbook';
import { Calendar, Clock, Edit3, Plus, Wrench, Phone, BookOpen, DollarSign, Zap, Search, MessageCircle, Users, X, Trash2, Minus, Bold, Italic, List, ListOrdered, Quote, Code, Link2, Image, ChevronUp, ChevronDown } from 'lucide-react';
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

interface ContentAreaProps {
  sections: Section[];
  currentPageId?: string;
  isEditMode?: boolean;
  handbookId?: string;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onUpdatePage?: (pageId: string, updates: Partial<Page>) => void;
  onAddPage?: (sectionId: string, title: string, content?: string) => void;
  onAddSection?: (title: string, insertIndex?: number) => void;
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
      BookOpen, Phone, Wrench, DollarSign, Clock, Search, MessageCircle, Users, Zap, Bold, Italic, List, ListOrdered, Quote, Code, Link2, Image
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
const getSectionIcon = (title: string) => {
  const normalizedTitle = title.toLowerCase();
  
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
  const formatButtons = [
    { icon: Bold, label: 'Fet text', format: '**text**', offset: 2 },
    { icon: Italic, label: 'Kursiv text', format: '*text*', offset: 1 },
    { icon: Quote, label: 'Citat', format: '> ', offset: 0 },
    { icon: Code, label: 'Kod', format: '`kod`', offset: 1 },
    { icon: Link2, label: 'Länk', format: '[länktext](url)', offset: 1 },
    { icon: List, label: 'Punktlista', format: '- ', offset: 0 },
    { icon: ListOrdered, label: 'Numrerad lista', format: '1. ', offset: 0 },
    { icon: Image, label: 'Bild', format: '![alt text](bildurl)', offset: 2 },
  ];

  const headerButtons = [
    { label: 'H1', format: '# ', offset: 0 },
    { label: 'H2', format: '## ', offset: 0 },
    { label: 'H3', format: '### ', offset: 0 },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {/* Header buttons */}
      <div className="flex gap-1 mr-2">
        {headerButtons.map((btn) => (
          <Button
            key={btn.label}
            variant="ghost"
            size="sm"
            onClick={() => onInsert(btn.format, btn.offset)}
            className="h-8 px-2 text-xs font-mono"
            title={`Rubrik ${btn.label}`}
          >
            {btn.label}
          </Button>
        ))}
      </div>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Format buttons */}
      <div className="flex gap-1">
        {formatButtons.map((btn) => {
          const IconComponent = btn.icon;
          return (
            <Button
              key={btn.label}
              variant="ghost"
              size="sm"
              onClick={() => onInsert(btn.format, btn.offset)}
              className="h-8 w-8 p-0"
              title={btn.label}
            >
              <IconComponent className="w-4 h-4" />
            </Button>
          );
        })}
      </div>
    </div>
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
  onSave?: () => void;
  onSaveAndExit?: () => void;
}

const RobustTextarea: React.FC<RobustTextareaProps> = ({
  value,
  onChange,
  placeholder,
  className,
  pageId,
  onSave,
  onSaveAndExit
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(false);

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
      {/* Enhanced toolbar with preview and save */}
      <div className="border border-gray-200 rounded-t-lg bg-gray-50 p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <MarkdownToolbar onInsert={insertMarkdown} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isPreview ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="h-8 px-3 text-xs"
          >
            {isPreview ? "Redigera" : "Förhandsgranska"}
          </Button>
          {onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              className="h-8 px-3 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              💾 Spara
            </Button>
          )}
          {onSaveAndExit && (
            <Button
              variant="default"
              size="sm"
              onClick={onSaveAndExit}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              💾 Spara och avsluta
            </Button>
          )}
        </div>
      </div>

      {/* Content area - either textarea or preview */}
      {isPreview ? (
        <div className={`
          min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm 
          rounded-t-none border-t-0 overflow-auto
        `}>
          <div className="prose prose-gray max-w-none">
            <MarkdownRenderer content={value || '*Inget innehåll att förhandsgranska*'} />
          </div>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={8}
          className={`
            flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm 
            ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none 
            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
            disabled:cursor-not-allowed disabled:opacity-50 resize-y
            ${className} rounded-t-none border-t-0
          `}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
        />
      )}
    </div>
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

  console.log('[ContentArea] Current page:', currentPage ? `${currentPage.title} (${currentPage.id})` : 'None');

  // If a specific page is selected, show that page
  if (currentPage) {
    const section = sections.find(s => s.pages?.some(p => p.id === currentPageId));
    
    return (
      <main className="flex-1 bg-gradient-to-br from-gray-50 to-white min-h-screen pt-20">
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
      </main>
    );
  }

  // Show all sections as a long scrollable page
  return (
    <main className="flex-1 bg-gradient-to-br from-gray-50 to-white min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome content - only show when no sections exist at all */}
        {(!sections || sections.length === 0) && !currentPageId && (
          <div className="mb-12">
            <EditableWelcomeContent data={welcomeContent} isEditMode={isEditMode} />
          </div>
        )}

        {/* All sections displayed vertically */}
        {sections && sections.length > 0 && (
          <div className="space-y-16">
            {/* Add section button before first section */}
            {isEditMode && onAddSection && (
              <section className="mb-16">
                <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors bg-gray-50/50">
                  <CardContent className="flex items-center justify-center py-12">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => onAddSection('Ny sektion', 0)}
                      className="space-x-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Lägg till ny sektion</span>
                    </Button>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* All handbook sections */}
            {sections.map((section, sectionIndex) => {
              const IconComponent = getSectionIcon(section.title);
              
              return (
                <section 
                  key={section.id} 
                  id={`section-${section.id}`}
                  className="scroll-mt-24"
                >
                  {/* Section Header */}
                  <div className="mb-8">
                    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                      <CardHeader className="pb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                              <IconComponent className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                              </div>
                              {isEditMode ? (
                                <div className="space-y-2">
                                  <Input
                                    value={section.title}
                                    onChange={(e) => onUpdateSection?.(section.id, { title: e.target.value })}
                                    className="text-2xl font-bold border-dashed border-gray-300"
                                    placeholder="Sektionsnamn"
                                  />
                                  <Textarea
                                    value={section.description || ''}
                                    onChange={(e) => onUpdateSection?.(section.id, { description: e.target.value })}
                                    className="text-lg border-dashed border-gray-300 resize-none"
                                    placeholder="Beskrivning (valfritt)"
                                    rows={2}
                                  />
                                </div>
                              ) : (
                                <>
                                  <CardTitle className="text-3xl font-bold text-gray-900 leading-tight">
                                    {section.title}
                                  </CardTitle>
                                  {section.description && (
                                    <CardDescription className="text-lg text-gray-600 mt-2 leading-relaxed">
                                      {section.description}
                                    </CardDescription>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {isEditMode && (
                            <div className="flex items-center space-x-2">
                              {onMoveSection && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onMoveSection(section.id, 'up')}
                                    disabled={sectionIndex === 0}
                                    className="text-gray-600 hover:text-blue-600"
                                    title="Flytta upp"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onMoveSection(section.id, 'down')}
                                    disabled={sectionIndex === sections.length - 1}
                                    className="text-gray-600 hover:text-blue-600"
                                    title="Flytta ner"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDeleteSection?.(section.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Section Pages */}
                  {section.pages && section.pages.length > 0 && (
                    <div className="space-y-8 ml-4 border-l-2 border-gray-200 pl-8">
                      {section.pages.map((page, pageIndex) => (
                        <div key={page.id} className="relative">
                          {/* Page indicator dot */}
                          <div className="absolute -left-10 top-6 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-sm"></div>
                          
                          <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-200">
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  {page.lastUpdated && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {page.lastUpdated}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {isEditMode ? (
                                <Input
                                  value={page.title}
                                  onChange={(e) => onUpdatePage?.(page.id, { title: e.target.value })}
                                  className="text-xl font-semibold border-dashed border-gray-300"
                                  placeholder="Sidtitel"
                                />
                              ) : (
                                <CardTitle className="text-2xl font-semibold text-gray-900 leading-tight">
                                  {page.title}
                                </CardTitle>
                              )}
                            </CardHeader>
                            <CardContent>
                              {isEditMode ? (
                                <div className="space-y-0">
                                  <RobustTextarea
                                    value={getPageContent(page)}
                                    onChange={(newValue) => handleContentChange(page.id, newValue)}
                                    placeholder="Skriv innehåll här... (Markdown stöds)"
                                    className="min-h-[200px] font-mono text-sm border-dashed border-gray-300 rounded-t-none border-t-0"
                                    pageId={page.id}
                                    onSave={() => handleManualSave(page.id)}
                                    onSaveAndExit={() => handleSaveAndExit(page.id)}
                                  />
                                  {/* Save status indicator */}
                                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                                    <div className="flex items-center space-x-2">
                                      {getSaveStatus(page.id) === 'saving' && (
                                        <span className="flex items-center space-x-1 text-blue-600">
                                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                          <span>Sparar...</span>
                                        </span>
                                      )}
                                      {getSaveStatus(page.id) === 'saved' && (
                                        <span className="flex items-center space-x-1 text-green-600">
                                          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                                          <span>Sparat</span>
                                        </span>
                                      )}
                                      {getSaveStatus(page.id) === 'unsaved' && (
                                        <span className="flex items-center space-x-1 text-orange-600">
                                          <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                                          <span>Osparade ändringar</span>
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-gray-400">
                                      Sparas automatiskt efter 0.5s
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="prose prose-gray max-w-none">
                                  <MarkdownRenderer content={page.content || ''} />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty section message */}
                  {(!section.pages || section.pages.length === 0) && (
                    <div className="ml-4 border-l-2 border-gray-200 pl-8">
                      <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50">
                        <CardContent className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">Inga sidor i denna sektion än</p>
                            {isEditMode && onAddPage && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => onAddPage(section.id, 'Ny sida')}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Lägg till sida
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Section separator */}
                  {sectionIndex < sections.length - 1 && (
                    <div className="mt-16 mb-8">
                      <Separator className="bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                      {/* Add section button between sections */}
                      {isEditMode && onAddSection && (
                        <div className="flex justify-center mt-8 mb-8">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onAddSection('Ny sektion', sectionIndex + 1)}
                            className="space-x-2 text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Lägg till ny sektion</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}

            {/* Add section button for editors */}
            {isEditMode && onAddSection && (
              <section className="mt-16">
                <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors bg-gray-50/50">
                  <CardContent className="flex items-center justify-center py-16">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => onAddSection('Ny sektion')}
                      className="space-x-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Lägg till ny sektion</span>
                    </Button>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}; 