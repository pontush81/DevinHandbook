import React, { useState, useCallback } from 'react';
import { HandbookSection as Section } from '@/types/handbook';
import { Calendar, Clock, Edit, Save, Plus, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Home, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EditorJSComponent } from '@/components/ui/EditorJSComponent';
import { parseEditorJSContent, stringifyEditorJSContent } from '@/lib/utils/editorjs';

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

  // Group sections by category (could be enhanced with actual categories)
  const welcomeSections = sections.filter(s => 
    s.title.toLowerCase().includes('välkommen') || 
    s.title.toLowerCase().includes('översikt') ||
    s.order_index <= 2
  );
  
  const informationSections = sections.filter(s => 
    s.title.toLowerCase().includes('kontakt') || 
    s.title.toLowerCase().includes('styrelse') ||
    s.title.toLowerCase().includes('info')
  );
  
  const practicalSections = sections.filter(s => 
    !welcomeSections.includes(s) && 
    !informationSections.includes(s)
  );

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
      onUpdateSection?.(sectionId, { content });
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

  const renderSectionCategory = (title: string, description: string, icon: React.ReactNode, sections: Section[]) => {
    if (sections.length === 0) return null;

    return (
      <div className="category-section">
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div key={section.id} id={`section-${section.id}`} className="section-card">
              {/* Section status indicator */}
              <div className={`section-status-indicator ${section.is_published ? '' : 'draft'}`} />
              
              {/* Section Header */}
              <div className="section-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="p-1 hover:bg-white/50 rounded-full transition-colors"
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      )}
                    </button>
                    <div>
                      <h3 className="section-title text-xl font-semibold text-gray-900">
                        {section.title}
                      </h3>
                      {section.description && (
                        <p className="section-description text-gray-600 mt-1">
                          {section.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {section.pages && section.pages.length > 0 && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        {section.pages.length} sidor
                      </Badge>
                    )}

                    {isEditMode && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleSectionEdit(section.id)}
                        className="bg-white/80 hover:bg-white/90"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {editingSections.has(section.id) ? 'Sluta redigera' : 'Redigera sektion'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Section Content */}
              {expandedSections.has(section.id) && (
                <div className="section-content">
                  {/* Section content editing */}
                  {editingSections.has(section.id) && isEditMode ? (
                    <div className="edit-mode-banner mb-6">
                      <div className="edit-mode-banner-content">
                        <h4 className="edit-mode-banner-title">Redigera sektionsinnehåll</h4>
                        <p className="edit-mode-banner-subtitle">
                          Skriv en beskrivning för denna sektion
                        </p>
                      </div>
                      <div className="mt-4">
                        <EditorJSComponent
                          content={parseEditorJSContent(section.content)}
                          onChange={(data) => handleSectionContentChange(section.id, data)}
                          readOnly={false}
                          placeholder="Skriv en beskrivning för denna sektion..."
                          handbookId={handbookId}
                        />
                      </div>
                    </div>
                  ) : section.content && (
                    <div className="welcome-section-card mb-6">
                      <EditorJSComponent
                        content={parseEditorJSContent(section.content)}
                        onChange={() => {}} 
                        readOnly={true}
                        handbookId={handbookId}
                      />
                    </div>
                  )}
                  
                  {/* Pages in section */}
                  {section.pages && section.pages.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="subsection-title text-lg font-medium text-gray-800 border-b pb-2">
                        Sidor i denna sektion
                      </h4>
                      
                      {section.pages.map((page) => (
                        <article key={page.id} className="page-card">
                          <div className="page-header">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="page-title text-lg font-medium text-gray-900">
                                  {page.title}
                                </h3>
                                {page.subtitle && (
                                  <p className="text-gray-600 mt-1">{page.subtitle}</p>
                                )}
                              </div>

                              <div className="flex items-center space-x-3">
                                {page.lastUpdated && (
                                  <div className="page-meta-item text-sm text-gray-500">
                                    <Clock className="h-4 w-4" />
                                    <span>Uppdaterad {page.lastUpdated}</span>
                                  </div>
                                )}

                                {isEditMode && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => togglePageEdit(page.id)}
                                    className="bg-white/80 hover:bg-white/90"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    {editingPages.has(page.id) ? 'Sluta redigera' : 'Redigera sida'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="prose max-w-none">
                            {editingPages.has(page.id) && isEditMode ? (
                              <EditorJSComponent
                                content={parseEditorJSContent(page.content)}
                                onChange={(data) => handlePageContentChange(page.id, data)}
                                readOnly={false}
                                placeholder="Skriv innehållet för denna sida..."
                                handbookId={handbookId}
                              />
                            ) : (
                              <EditorJSComponent
                                content={parseEditorJSContent(page.content)}
                                onChange={() => {}}
                                readOnly={true}
                                handbookId={handbookId}
                              />
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {/* No pages message */}
                  {(!section.pages || section.pages.length === 0) && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Denna sektion har inga sidor än. {isEditMode && 'Använd redigeringsläget för att lägga till innehåll.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="content-area-container">
      {/* Trial Status Bar */}
      {trialStatusBar && (
        <div className="flex-shrink-0">
          {trialStatusBar}
        </div>
      )}
      
      {/* Content with enhanced styling */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Section separators between categories */}
          <div className="sections-container space-y-4">
            {/* Welcome & Overview Category */}
            {renderSectionCategory(
              "Komma igång",
              "Grundläggande information och översikt",
              <Home className="h-5 w-5" />,
              welcomeSections
            )}

            {/* Information Category */}
            {renderSectionCategory(
              "Kontakt & Information", 
              "Viktiga kontaktuppgifter och organisationsinformation",
              <BookOpen className="h-5 w-5" />,
              informationSections
            )}

            {/* Practical Category */}
            {renderSectionCategory(
              "Praktisk information",
              "Dagliga rutiner, regler och praktiska guider",
              <CheckCircle className="h-5 w-5" />,
              practicalSections
            )}
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