import React, { useState, useCallback } from 'react';
import { HandbookSection as Section } from '@/types/handbook';
import { Calendar, Clock, Edit, Save, Plus, ChevronDown, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
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
}

export function AllSectionsView({ 
  sections, 
  isEditMode = false, 
  onUpdateSection,
  onUpdatePage 
}: AllSectionsViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());
  const [editingPages, setEditingPages] = useState<Set<string>>(new Set());
  const [savingStates, setSavingStates] = useState<Map<string, boolean>>(new Map());
  const [errorStates, setErrorStates] = useState<Map<string, string>>(new Map());
  const [successStates, setSuccessStates] = useState<Map<string, boolean>>(new Map());

  // Auto-expand all sections by default
  React.useEffect(() => {
    if (sections && sections.length > 0) {
      setExpandedSections(new Set(sections.map(s => s.id)));
    }
  }, [sections]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const toggleSectionEdit = (sectionId: string) => {
    setEditingSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const togglePageEdit = (pageId: string) => {
    setEditingPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const handleSectionContentChange = useCallback(async (sectionId: string, data: any) => {
    if (!onUpdateSection) return;
    
    setSavingStates(prev => new Map(prev).set(sectionId, true));
    setErrorStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(sectionId);
      return newMap;
    });
    
    try {
      await onUpdateSection(sectionId, {
        content: stringifyEditorJSContent(data)
      });
      
      // Show success feedback
      setSuccessStates(prev => new Map(prev).set(sectionId, true));
      setTimeout(() => {
        setSuccessStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(sectionId);
          return newMap;
        });
      }, 3000);
      
    } catch (error) {
      console.error('Error updating section content:', error);
      setErrorStates(prev => new Map(prev).set(sectionId, 
        error instanceof Error ? error.message : 'Det gick inte att spara sektionen'
      ));
    } finally {
      setSavingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(sectionId);
        return newMap;
      });
    }
  }, [onUpdateSection]);

  const handlePageContentChange = useCallback(async (pageId: string, data: any) => {
    if (!onUpdatePage) return;
    
    setSavingStates(prev => new Map(prev).set(pageId, true));
    setErrorStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(pageId);
      return newMap;
    });
    
    try {
      await onUpdatePage(pageId, {
        content: stringifyEditorJSContent(data)
      });
      
      // Show success feedback
      setSuccessStates(prev => new Map(prev).set(pageId, true));
      setTimeout(() => {
        setSuccessStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(pageId);
          return newMap;
        });
      }, 3000);
      
    } catch (error) {
      console.error('Error updating page content:', error);
      setErrorStates(prev => new Map(prev).set(pageId, 
        error instanceof Error ? error.message : 'Det gick inte att spara sidan'
      ));
    } finally {
      setSavingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(pageId);
        return newMap;
      });
    }
  }, [onUpdatePage]);

  if (!sections || sections.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inga sektioner än</h2>
          <p className="text-gray-600 mb-6">
            Detta handbok har inga sektioner än. Börja genom att lägga till din första sektion.
          </p>
          {isEditMode && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Lägg till sektion
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {/* Content with sections-container styling */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="sections-container">
            {sections.map((section, index) => (
              <div key={section.id} id={`section-${section.id}`} className="section-card">
                {/* Section Header with beautiful gradient */}
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
                        <h2 className="section-title">{section.title}</h2>
                        {section.description && (
                          <p className="section-description">
                            {section.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {section.pages && (
                        <Badge variant="secondary" className="bg-white/70">
                          {section.pages.length} sidor
                        </Badge>
                      )}
                      
                      {savingStates.get(section.id) && (
                        <Badge variant="outline" className="bg-white/70">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                          Sparar...
                        </Badge>
                      )}
                      
                      {successStates.get(section.id) && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sparad
                        </Badge>
                      )}
                      
                      {errorStates.get(section.id) && (
                        <Badge 
                          variant="outline" 
                          className="bg-red-50 text-red-700 border-red-200 cursor-help"
                          title={errorStates.get(section.id)}
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Fel
                        </Badge>
                      )}
                      
                      {/* Edit button for section content */}
                      {isEditMode && section.content && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleSectionEdit(section.id)}
                          className="bg-white/80 hover:bg-white/90"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {editingSections.has(section.id) ? 'Sluta redigera' : 'Redigera beskrivning'}
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
                          />
                        </div>
                      </div>
                    ) : section.content && (
                      <div className="welcome-section-card mb-6">
                        <EditorJSComponent
                          content={parseEditorJSContent(section.content)}
                          onChange={() => {}} 
                          readOnly={true}
                        />
                      </div>
                    )}
                    
                    {/* Pages in section */}
                    {section.pages && section.pages.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="subsection-title">
                          Sidor i denna sektion
                        </h4>
                        
                        {section.pages.map((page) => (
                          <article key={page.id} className="page-article">
                            <div className="page-header">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="page-title">{page.title}</h3>
                                  {page.subtitle && (
                                    <p className="text-gray-600">{page.subtitle}</p>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {savingStates.get(page.id) && (
                                    <Badge variant="outline">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                                      Sparar...
                                    </Badge>
                                  )}
                                  
                                  {successStates.get(page.id) && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Sparad
                                    </Badge>
                                  )}
                                  
                                  {errorStates.get(page.id) && (
                                    <Badge 
                                      variant="outline" 
                                      className="bg-red-50 text-red-700 border-red-200 cursor-help"
                                      title={errorStates.get(page.id)}
                                    >
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Fel
                                    </Badge>
                                  )}
                                  
                                  {/* Edit button for page content */}
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
                            
                            <div className="prose">
                              {editingPages.has(page.id) && isEditMode ? (
                                <EditorJSComponent
                                  content={parseEditorJSContent(page.content)}
                                  onChange={(data) => handlePageContentChange(page.id, data)}
                                  readOnly={false}
                                  placeholder="Skriv innehållet för denna sida..."
                                />
                              ) : (
                                <EditorJSComponent
                                  content={parseEditorJSContent(page.content)}
                                  onChange={() => {}}
                                  readOnly={true}
                                />
                              )}
                              
                              {/* Page metadata */}
                              {page.updated_at && (
                                <div className="page-meta mt-4">
                                  <Clock className="h-4 w-4" />
                                  <span>Uppdaterad {new Date(page.updated_at).toLocaleDateString('sv-SE')}</span>
                                </div>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 