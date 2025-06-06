import React, { useState, useCallback, createElement } from 'react';
import { HandbookSection as Section } from '@/types/handbook';
import { Calendar, Clock, Edit, Save, Plus, ChevronDown, ChevronRight, AlertCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EditorJSComponent } from '@/components/ui/EditorJSComponent';
import { parseEditorJSContent, stringifyEditorJSContent } from '@/lib/utils/editorjs';

// Simple read-only content renderer for EditorJS data
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

// Helper function to get clean text summary from EditorJS content
const getTextSummary = (content: any, maxLength: number = 100): string => {
  if (!content || !content.blocks) return '';
  
  let text = '';
  for (const block of content.blocks) {
    if (block.data?.text) {
      text += block.data.text + ' ';
      if (text.length > maxLength) break;
    }
  }
  
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text.trim();
};

interface AllSectionsViewProps {
  sections: Section[];
  isEditMode?: boolean;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onUpdatePage?: (pageId: string, updates: Partial<any>) => void;
  trialStatusBar?: React.ReactNode;
  handbookId?: string;
}

export function AllSectionsView({ 
  sections, 
  isEditMode = false, 
  onUpdateSection,
  onUpdatePage,
  trialStatusBar,
  handbookId
}: AllSectionsViewProps) {
  // Initialize with all sections expanded for better UX
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(section => section.id))
  );
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());
  const [editingPages, setEditingPages] = useState<Set<string>>(new Set());
  const [sectionContents, setSectionContents] = useState<Map<string, any>>(new Map());
  const [pageContents, setPageContents] = useState<Map<string, any>>(new Map());

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

  const toggleSectionEdit = useCallback((sectionId: string) => {
    setEditingSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const togglePageEdit = useCallback((pageId: string) => {
    setEditingPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  }, []);

  const handleSectionContentChange = useCallback((sectionId: string, data: any) => {
    setSectionContents(prev => new Map(prev.set(sectionId, data)));
    
    // Auto-save after 2 seconds of inactivity
    setTimeout(() => {
      const content = stringifyEditorJSContent(data);
      // Save as description since sections table doesn't have content column
      onUpdateSection?.(sectionId, { description: content });
    }, 2000);
  }, [onUpdateSection]);

  const handlePageContentChange = useCallback((pageId: string, data: any) => {
    setPageContents(prev => new Map(prev.set(pageId, data)));
    
    // Auto-save after 2 seconds of inactivity
    setTimeout(() => {
      const content = stringifyEditorJSContent(data);
      onUpdatePage?.(pageId, { content });
    }, 2000);
  }, [onUpdatePage]);

  return (
    <div className="content-area-container">
      {/* Trial Status Bar */}
      {trialStatusBar && (
        <div className="flex-shrink-0">
          {trialStatusBar}
        </div>
      )}
      
      {/* Content with clean styling */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Simple list of all sections */}
          <div className="space-y-2">
            {sections.map((section, index) => (
              <div key={section.id} id={`section-${section.id}`} className="notion-section-card">
                {/* Section Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {section.title}
                      </h3>
                      {section.description && !section.description.startsWith('{') && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {section.description}
                        </p>
                      )}
                      {section.description && section.description.startsWith('{') && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {getTextSummary(parseEditorJSContent(section.description), 150)}
                        </p>
                      )}
                    </div>
                  </div>

                  {isEditMode && !editingSections.has(section.id) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleSectionEdit(section.id)}
                      className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 h-7 px-2"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Redigera
                    </Button>
                  )}
                </div>
                
                {/* Section Content - Always Visible */}
                {editingSections.has(section.id) && isEditMode ? (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="mt-3">
                      <EditorJSComponent
                        content={parseEditorJSContent(section.description)}
                        onChange={(data) => handleSectionContentChange(section.id, data)}
                        readOnly={false}
                        placeholder="Skriv en beskrivning för denna sektion..."
                        handbookId={handbookId}
                      />
                    </div>
                  </div>
                ) : section.description && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="mt-3 prose prose-sm max-w-none text-gray-600">
                      <ReadOnlyEditorContent content={parseEditorJSContent(section.description)} />
                    </div>
                  </div>
                )}
                
                {/* Pages in section */}
                {section.pages && section.pages.length > 0 && (
                  <div className="px-4 pb-4">
                    {section.pages.map((page) => (
                      <div key={page.id} className="py-3 pl-4 border-l-2 border-gray-100 ml-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                              {page.title}
                            </h4>
                            {page.subtitle && (
                              <p className="text-xs text-gray-500 mb-2">{page.subtitle}</p>
                            )}
                            
                            {/* Show page content preview */}
                            {page.content && (
                              <div className="mt-2">
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
                                ) : (
                                  <div className="prose prose-sm max-w-none text-gray-600">
                                    <ReadOnlyEditorContent content={parseEditorJSContent(page.content)} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {page.lastUpdated && (
                              <div className="flex items-center text-xs text-gray-400">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{page.lastUpdated}</span>
                              </div>
                            )}

                            {isEditMode && !editingPages.has(page.id) && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => togglePageEdit(page.id)}
                                className="text-xs h-6 px-1 text-gray-400 hover:text-gray-600"
                              >
                                <Edit className="h-3 w-3" />
                                <span className="sr-only">
                                  Redigera {page.title}
                                </span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No pages message */}
                {(!section.pages || section.pages.length === 0) && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="mt-3 text-center py-6">
                      <p className="text-xs text-gray-400">
                        Denna sektion har inget innehåll än.
                        {isEditMode && <span className="block mt-1 text-blue-500">Använd redigeringsläget för att lägga till innehåll.</span>}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {sections.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Inga sektioner än
              </h3>
              <p className="text-gray-600">
                {isEditMode ? 'Börja genom att lägga till din första sektion.' : 'Handboken håller på att byggas upp.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 