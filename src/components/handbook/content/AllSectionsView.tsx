import React, { useState, useCallback, createElement } from 'react';
import { HandbookSection as Section, HandbookPage as Page } from '@/types/handbook';
import { Calendar, Clock, Edit, Save, Plus, ChevronDown, ChevronRight, AlertCircle, BookOpen, Trash2, FileText, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EditorJSComponent } from '@/components/ui/EditorJSComponent';
import { IconPicker } from '@/components/ui/IconPicker';
import { parseEditorJSContent, stringifyEditorJSContent } from '@/lib/utils/editorjs';
import { getIconComponent } from '@/lib/icon-utils';
import { OutputData } from '@editorjs/editorjs';
import { HandbookAdminSettings } from '@/components/handbook/admin/HandbookAdminSettings';

// Simple read-only content renderer for EditorJS data (used for pages only)
const ReadOnlyEditorContent = ({ content }: { content: any }) => {
  if (!content || !content.blocks) {
    return null;
  }

  return (
    <div className="prose prose-sm max-w-none text-gray-700">
      {content.blocks.map((block: any, index: number) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={block.id || index} className="mb-3 leading-relaxed break-words">
                {block.data?.text || ''}
              </p>
            );
          case 'header':
            const level = block.data?.level || 1;
            const headerLevel = Math.min(Math.max(level, 1), 6);
            const headerTag = `h${headerLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
            return createElement(
              headerTag,
              {
                key: block.id || index,
                className: "font-semibold text-gray-900 mb-3 mt-4"
              },
              block.data?.text || ''
            );
          case 'list':
            const items = block.data?.items || [];
            if (block.data?.style === 'ordered') {
              return (
                <ol key={block.id || index} className="list-decimal list-inside mb-3 space-y-2 ml-4">
                  {items.map((item: any, itemIndex: number) => (
                    <li key={itemIndex} className="text-gray-700 leading-relaxed">{item.content || item}</li>
                  ))}
                </ol>
              );
            } else {
              return (
                <ul key={block.id || index} className="list-disc list-inside mb-3 space-y-2 ml-4">
                  {items.map((item: any, itemIndex: number) => (
                    <li key={itemIndex} className="text-gray-700 leading-relaxed">{item.content || item}</li>
                  ))}
                </ul>
              );
            }
          case 'quote':
            return (
              <blockquote key={block.id || index} className="border-l-4 border-gray-300 pl-4 mb-3 italic text-gray-600 bg-gray-50 py-2 rounded-r">
                {block.data?.text || ''}
              </blockquote>
            );
          case 'image':
            return (
              <div key={block.id || index} className="mb-4">
                {block.data?.file?.url && (
                  <img 
                    src={block.data.file.url} 
                    alt={block.data?.caption || ''} 
                    className="max-w-full h-auto rounded shadow-sm"
                  />
                )}
                {block.data?.caption && (
                  <p className="text-sm text-gray-500 mt-2 italic text-center">{block.data.caption}</p>
                )}
              </div>
            );
          case 'attaches':
            return (
              <div key={block.id || index} className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">📎</span>
                  {block.data?.file?.url ? (
                    <a 
                      href={block.data.file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      {block.data.file.name || 'Bifogad fil'}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500">Bifogad fil</span>
                  )}
                </div>
              </div>
            );
          default:
            // Fallback for unknown block types - don't show JSON!
            if (block.data?.text) {
              return (
                <p key={block.id || index} className="mb-3 text-gray-600 leading-relaxed">
                  {block.data.text}
                </p>
              );
            }
            return null;
        }
      })}
    </div>
  );
};

interface AllSectionsViewProps {
  sections: Section[];
  isEditMode?: boolean;
  isAdmin?: boolean;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onUpdatePage?: (pageId: string, updates: Partial<any>) => void;
  onDeleteSection?: (sectionId: string) => void;
  onDeletePage?: (pageId: string, sectionId: string) => void;
  onAddSection?: (section: Partial<Section>) => void;
  onAddPage?: (sectionId: string, page: Partial<any>) => Promise<{ id: string } | undefined>;
  onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void;
  trialStatusBar?: React.ReactNode;
  handbookId?: string;
  handbookSlug?: string;
  handbookData?: {
    id: string;
    title: string;
    forum_enabled?: boolean;
  };
  onUpdateHandbook?: (handbookId: string, updates: { forum_enabled?: boolean }) => void;
}

export function AllSectionsView({ 
  sections, 
  isEditMode = false, 
  isAdmin = false,
  onUpdateSection,
  onUpdatePage,
  onDeleteSection,
  onDeletePage,
  onAddSection,
  onAddPage,
  onMoveSection,
  trialStatusBar,
  handbookId,
  handbookSlug,
  handbookData,
  onUpdateHandbook
}: AllSectionsViewProps) {
  // Debug log to check props
  console.log('🔍 [AllSectionsView] Props received:', {
    sectionsCount: sections.length,
    isEditMode,
    hasOnMoveSection: !!onMoveSection,
    onMoveSectionType: typeof onMoveSection
  });
  
  // Initialize with all sections expanded for better UX
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(section => section.id))
  );
  const [editingPages, setEditingPages] = useState<Set<string>>(new Set());
  const [editingSectionIcons, setEditingSectionIcons] = useState<Set<string>>(new Set());
  const [editingSectionTitles, setEditingSectionTitles] = useState<Set<string>>(new Set());
  const [editingPageTitles, setEditingPageTitles] = useState<Set<string>>(new Set());
  const [pageContents, setPageContents] = useState<Map<string, any>>(new Map());
  const [tempSectionTitles, setTempSectionTitles] = useState<Map<string, string>>(new Map());
  const [tempPageTitles, setTempPageTitles] = useState<Map<string, string>>(new Map());

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const startEditingPage = useCallback((pageId: string) => {
    setEditingPages(prev => new Set(prev.add(pageId)));
  }, []);

  const toggleIconEdit = useCallback((sectionId: string) => {
    setEditingSectionIcons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const startEditingSectionTitle = useCallback((sectionId: string, currentTitle: string) => {
    setEditingSectionTitles(prev => new Set(prev.add(sectionId)));
    setTempSectionTitles(prev => new Map(prev.set(sectionId, currentTitle)));
  }, []);

  const startEditingPageTitle = useCallback((pageId: string, currentTitle: string) => {
    setEditingPageTitles(prev => new Set(prev.add(pageId)));
    setTempPageTitles(prev => new Map(prev.set(pageId, currentTitle)));
  }, []);

  const saveSectionTitle = useCallback((sectionId: string) => {
    const newTitle = tempSectionTitles.get(sectionId);
    if (newTitle && newTitle.trim()) {
      onUpdateSection?.(sectionId, { title: newTitle.trim() });
    }
    setEditingSectionTitles(prev => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });
    setTempSectionTitles(prev => {
      const newMap = new Map(prev);
      newMap.delete(sectionId);
      return newMap;
    });
  }, [tempSectionTitles, onUpdateSection]);

  const savePageTitle = useCallback((pageId: string) => {
    const newTitle = tempPageTitles.get(pageId);
    if (newTitle && newTitle.trim()) {
      onUpdatePage?.(pageId, { title: newTitle.trim() });
    }
    setEditingPageTitles(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageId);
      return newSet;
    });
    setTempPageTitles(prev => {
      const newMap = new Map(prev);
      newMap.delete(pageId);
      return newMap;
    });
  }, [tempPageTitles, onUpdatePage]);

  const handlePageContentChange = useCallback((pageId: string, data: OutputData) => {
    setPageContents(prev => new Map(prev.set(pageId, data)));
    
    // Auto-save after 2 seconds of inactivity
    setTimeout(() => {
      const content = stringifyEditorJSContent(data);
      onUpdatePage?.(pageId, { content });
    }, 2000);
  }, [onUpdatePage]);

  const handleDeleteSection = useCallback((sectionId: string, sectionTitle: string) => {
    if (window.confirm(`Är du säker på att du vill radera sektionen "${sectionTitle}"? Detta kommer radera alla sidor i sektionen. Denna åtgärd kan inte ångras.`)) {
      onDeleteSection?.(sectionId);
    }
  }, [onDeleteSection]);

  const handleDeletePage = useCallback((pageId: string, sectionId: string, pageTitle: string) => {
    if (window.confirm(`Är du säker på att du vill radera sidan "${pageTitle}"? Denna åtgärd kan inte ångras.`)) {
      onDeletePage?.(pageId, sectionId);
    }
  }, [onDeletePage]);

  const handleIconSelect = useCallback((sectionId: string, icon: string) => {
    onUpdateSection?.(sectionId, { icon });
    setEditingSectionIcons(prev => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });
  }, [onUpdateSection]);

  const handleAddSection = useCallback(() => {
    if (onAddSection) {
      onAddSection({
        title: 'Ny sektion',
        description: '',
        icon: 'BookOpen',
        is_published: true,
        is_public: true
      });
    }
  }, [onAddSection]);

  const handleAddPage = useCallback(async (sectionId: string) => {
    if (onAddPage) {
      try {
        const newPage = await onAddPage(sectionId, {
          title: 'Ny sida',
          content: '',
          is_published: true
        });
        
        // If the page was created successfully, automatically start editing it
        if (newPage?.id) {
          console.log('[AllSectionsView] Auto-starting edit mode for new page:', newPage.id);
          setTimeout(() => {
            setEditingPages(prev => new Set(prev.add(newPage.id)));
          }, 100); // Small delay to ensure DOM is updated
        }
      } catch (error) {
        console.error('[AllSectionsView] Error creating page:', error);
        // Error handling is already done in the parent component
      }
    }
  }, [onAddPage]);

  return (
    <div>
      {/* Trial Status Bar */}
      {trialStatusBar && (
        <div>
          {trialStatusBar}
        </div>
      )}
      
      {/* Content with clean styling */}
      <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
        {/* Admin Settings Panel - only in edit mode */}
        {isEditMode && handbookData && handbookSlug && (
          <HandbookAdminSettings
            handbookData={handbookData}
            handbookSlug={handbookSlug}
            isAdmin={isAdmin}
            onUpdateHandbook={onUpdateHandbook}
            onOpenMembersManager={() => {
              window.location.href = `/${handbookSlug}/members`;
            }}
          />
        )}

        {/* Header explaining structure - only in edit mode */}
        {isEditMode && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">📚 Handboksstruktur</h3>
            <p className="text-sm text-blue-700 mb-3">
              <strong>Sektioner</strong> (📁) innehåller <strong>sidor</strong> (📄). I redigeringsläget kan du klicka direkt på titlar och innehåll för att redigera det, eller använda radera-knapparna för att ta bort sektioner och sidor.
            </p>
            
            <Button
              onClick={handleAddSection}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Lägg till ny sektion
            </Button>
          </div>
        )}

        {/* Vertical list of all sections */}
        <div className="space-y-4">
          {sections.map((section, index) => {
            const IconComponent = getIconComponent(section.icon);
            
            return (
              <div key={section.id} id={`section-${section.id}`} className="notion-section-card border border-gray-200 rounded-lg overflow-hidden">
                {/* Section Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Section Icon */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 flex-shrink-0" />
                        {isEditMode && (
                          <span className="hidden sm:inline text-xs font-medium text-blue-600 uppercase tracking-wide">SEKTION</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Editable Section Title */}
                      {editingSectionTitles.has(section.id) && isEditMode ? (
                        <input
                          type="text"
                          value={tempSectionTitles.get(section.id) || section.title}
                          onChange={(e) => setTempSectionTitles(prev => new Map(prev.set(section.id, e.target.value)))}
                          onBlur={() => saveSectionTitle(section.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveSectionTitle(section.id);
                            } else if (e.key === 'Escape') {
                              setEditingSectionTitles(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(section.id);
                                return newSet;
                              });
                            }
                          }}
                          className="text-base font-semibold text-gray-900 bg-white border border-blue-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <h3 
                          className={`text-sm sm:text-base lg:text-lg font-semibold text-gray-900 leading-tight ${isEditMode ? 'cursor-pointer hover:text-blue-600' : ''}`}
                          onClick={isEditMode ? () => startEditingSectionTitle(section.id, section.title) : undefined}
                          title={isEditMode ? "Klicka för att redigera titeln" : undefined}
                        >
                          {section.title}
                        </h3>
                      )}

                      {/* Section Settings in Edit Mode */}
                      {isEditMode && (
                        <div className="mt-2 flex flex-wrap gap-4 text-xs">
                                                     {/* Section Status Selector */}
                           <div className="flex items-center gap-3">
                             <span className="text-gray-500 font-medium">Synlighet:</span>
                             
                             {/* Draft/Utkast */}
                            <div className="flex items-center gap-1">
                              <input
                                type="radio"
                                id={`section-draft-${section.id}`}
                                name={`section-visibility-${section.id}`}
                                checked={section.is_published === false}
                                onChange={() => {
                                  onUpdateSection?.(section.id, { is_published: false });
                                }}
                                className="h-3 w-3 text-gray-600 focus:ring-gray-500"
                              />
                              <label 
                                htmlFor={`section-draft-${section.id}`}
                                className="text-gray-600 cursor-pointer flex items-center gap-1"
                                title="Dold för alla utom redigerare - används för sektioner som inte är klara"
                              >
                                📝 Utkast
                              </label>
                            </div>

                            {/* Members Only */}
                            <div className="flex items-center gap-1">
                              <input
                                type="radio"
                                id={`section-members-${section.id}`}
                                name={`section-visibility-${section.id}`}
                                checked={section.is_published !== false && section.is_public === false}
                                onChange={() => {
                                  onUpdateSection?.(section.id, { is_published: true, is_public: false });
                                }}
                                className="h-3 w-3 text-orange-600 focus:ring-orange-500"
                              />
                              <label 
                                htmlFor={`section-members-${section.id}`}
                                className="text-gray-600 cursor-pointer flex items-center gap-1"
                                title="Synlig endast för inloggade medlemmar"
                              >
                                🔒 Endast medlemmar
                              </label>
                            </div>

                            {/* Public */}
                            <div className="flex items-center gap-1">
                              <input
                                type="radio"
                                id={`section-public-${section.id}`}
                                name={`section-visibility-${section.id}`}
                                checked={section.is_published !== false && section.is_public !== false}
                                onChange={() => {
                                  onUpdateSection?.(section.id, { is_published: true, is_public: true });
                                }}
                                className="h-3 w-3 text-green-600 focus:ring-green-500"
                              />
                              <label 
                                htmlFor={`section-public-${section.id}`}
                                className="text-gray-600 cursor-pointer flex items-center gap-1"
                                title="Synlig för alla besökare"
                              >
                                🌐 Synlig för alla
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditMode && (
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      {/* Move Section Up/Down Buttons */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          console.log('⬆️ [AllSectionsView] Up button clicked for section:', section.id, section.title);
                          onMoveSection?.(section.id, 'up');
                        }}
                        disabled={index === 0}
                        className="text-gray-600 hover:bg-gray-50 hover:text-gray-700 h-7 w-7 sm:h-8 sm:w-8 p-0 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Flytta sektion uppåt"
                      >
                        <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          console.log('⬇️ [AllSectionsView] Down button clicked for section:', section.id, section.title);
                          onMoveSection?.(section.id, 'down');
                        }}
                        disabled={index === sections.length - 1}
                        className="text-gray-600 hover:bg-gray-50 hover:text-gray-700 h-7 w-7 sm:h-8 sm:w-8 p-0 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Flytta sektion nedåt"
                      >
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleIconEdit(section.id)}
                        className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-7 w-7 sm:h-8 sm:w-8 p-0"
                        title="Ändra ikon"
                      >
                        🎨
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteSection(section.id, section.title)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 h-7 w-7 sm:h-8 sm:w-8 p-0"
                        title="Radera sektion"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Icon Picker */}
                {editingSectionIcons.has(section.id) && isEditMode && (
                  <div className="p-4 bg-blue-50 border-b border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">Välj ikon för sektionen:</h4>
                    <IconPicker
                      selectedIcon={section.icon || 'BookOpen'}
                      onIconSelect={(icon) => handleIconSelect(section.id, icon)}
                      compact={true}
                      size="sm"
                    />
                  </div>
                )}
                
                {/* Pages in section */}
                {section.pages && section.pages.length > 0 && (
                  <div className="bg-white">
                    {section.pages.map((page) => (
                      <div key={page.id} className="border-t border-gray-100 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex items-center gap-2 mt-1">
                              <FileText className="h-4 w-4 text-green-600" />
                              {isEditMode && (
                                <span className="hidden sm:inline text-xs font-medium text-green-600 uppercase tracking-wide">SIDA</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Editable Page Title */}
                              {editingPageTitles.has(page.id) && isEditMode ? (
                                <input
                                  type="text"
                                  value={tempPageTitles.get(page.id) || page.title}
                                  onChange={(e) => setTempPageTitles(prev => new Map(prev.set(page.id, e.target.value)))}
                                  onBlur={() => savePageTitle(page.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      savePageTitle(page.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingPageTitles(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(page.id);
                                        return newSet;
                                      });
                                    }
                                  }}
                                  className="text-sm font-semibold text-gray-900 bg-white border border-green-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-500 mb-1"
                                  autoFocus
                                />
                              ) : (
                                <h4 
                                  className={`text-sm font-semibold text-gray-900 mb-1 ${isEditMode ? 'cursor-pointer hover:text-green-600' : ''}`}
                                  onClick={isEditMode ? () => startEditingPageTitle(page.id, page.title) : undefined}
                                  title={isEditMode ? "Klicka för att redigera titeln" : undefined}
                                >
                                  {page.title}
                                </h4>
                              )}
                              {page.subtitle && (
                                <p className="text-xs text-gray-500 mb-2">{page.subtitle}</p>
                              )}
                              
                              {/* Show page content preview - Clickable for editing */}
                              {(page.content || isEditMode) && (
                                <div className={`mt-2 ${isEditMode && !editingPages.has(page.id) ? 'cursor-pointer hover:bg-gray-50 rounded p-2' : ''}`}
                                     onClick={isEditMode && !editingPages.has(page.id) ? () => startEditingPage(page.id) : undefined}>
                                  {editingPages.has(page.id) && isEditMode ? (
                                    <div className="bg-gray-50 p-3 rounded-md">
                                      <EditorJSComponent
                                        content={parseEditorJSContent(page.content)}
                                        onChange={(data) => handlePageContentChange(page.id, data)}
                                        readOnly={false}
                                        placeholder="Skriv innehållet för denna sida..."
                                        handbookId={handbookId}
                                      />
                                    </div>
                                  ) : page.content ? (
                                    <div className="prose prose-sm max-w-none text-gray-600">
                                      <ReadOnlyEditorContent content={parseEditorJSContent(page.content)} />
                                      {isEditMode && !editingPages.has(page.id) && (
                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-center">
                                          <p className="text-xs text-blue-600">Klicka för att redigera denna sida</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : isEditMode ? (
                                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-center">
                                      <p className="text-xs text-blue-600">Klicka för att lägga till innehåll till denna sida</p>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:ml-4">
                            {page.lastUpdated && (
                              <div className="flex sm:hidden items-center text-xs text-gray-400 order-1">
                                <Clock className="h-3 w-3 mr-1" />
                                <span className="truncate text-xs">{new Date(page.lastUpdated).toLocaleDateString('sv-SE')}</span>
                              </div>
                            )}
                            
                            {page.lastUpdated && (
                              <div className="hidden sm:flex items-center text-xs text-gray-400">
                                <Clock className="h-3 w-3 mr-1" />
                                <span className="truncate">{page.lastUpdated}</span>
                              </div>
                            )}

                            {/* Page Settings in Edit Mode */}
                            {isEditMode && (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    id={`page-published-${page.id}`}
                                    checked={page.is_published !== false}
                                    onChange={(e) => {
                                      onUpdatePage?.(page.id, { is_published: e.target.checked });
                                    }}
                                    className="h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    title={page.is_published !== false ? "Sidan är publicerad och synlig" : "Sidan är ett utkast och dold"}
                                  />
                                  <label 
                                    htmlFor={`page-published-${page.id}`}
                                    className="text-xs text-gray-600 cursor-pointer"
                                    title={page.is_published !== false ? "Sidan är publicerad och synlig" : "Sidan är ett utkast och dold"}
                                  >
                                    Publicerad
                                  </label>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeletePage(page.id, section.id, page.title)}
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700 h-6 px-1 sm:h-8 sm:px-2"
                                  title="Radera sida"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add page button */}
                    {isEditMode && (
                      <div className="border-t border-gray-100 p-4">
                        <Button
                          onClick={() => handleAddPage(section.id)}
                          variant="outline"
                          size="sm"
                          className="w-full border-dashed border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Lägg till sida
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* No pages message */}
                {(!section.pages || section.pages.length === 0) && (
                  <div className="bg-white border-t border-gray-100 p-4">
                    <div className="text-center py-6">
                      <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400 mb-3">
                        Denna sektion har inga sidor än.
                      </p>
                      {isEditMode && (
                        <Button
                          onClick={() => handleAddPage(section.id)}
                          variant="outline"
                          size="sm"
                          className="border-dashed border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Lägg till första sidan
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {sections.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Inga sektioner än
            </h3>
            <p className="text-gray-600 mb-4">
              {isEditMode ? 'Börja genom att lägga till din första sektion.' : 'Handboken håller på att byggas upp.'}
            </p>
            {isEditMode && (
              <Button
                onClick={handleAddSection}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Lägg till första sektionen
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 