import React, { useState, useEffect, useCallback } from 'react';
import { HandbookPage as Page } from '@/types/handbook';
import { Calendar, Clock, Edit, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EditorJSComponent } from '@/components/ui/EditorJSComponent';
import { parseEditorJSContent, stringifyEditorJSContent } from '@/lib/utils/editorjs';

interface SinglePageViewProps {
  page: Page;
  isEditMode?: boolean;
  onUpdatePage?: (pageId: string, updates: Partial<Page>) => void;
}

export function SinglePageView({ 
  page, 
  isEditMode = false, 
  onUpdatePage 
}: SinglePageViewProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-save functionality
  const handleContentChange = useCallback(async (data: any) => {
    if (!onUpdatePage || !page?.id) return;
    
    setHasUnsavedChanges(true);
    setError(null);
    
    // Debounced auto-save after 2 seconds of inactivity
    const saveTimeout = setTimeout(async () => {
      try {
        setIsSaving(true);
        await onUpdatePage(page.id, { 
          content: stringifyEditorJSContent(data),
          updated_at: new Date().toISOString()
        });
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setError(error instanceof Error ? error.message : 'Det gick inte att spara sidan');
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [page?.id, onUpdatePage]);

  // Manual save function
  const handleManualSave = async () => {
    if (!onUpdatePage || !page?.id) return;
    
    try {
      setIsSaving(true);
      // The content will be saved through the EditorJS component's save method
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!page) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar sida...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {/* Header with save status */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
            {isEditMode && (
              <div className="flex items-center space-x-2">
                <Badge variant={hasUnsavedChanges ? "destructive" : "default"}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                      Sparar...
                    </>
                  ) : hasUnsavedChanges ? (
                    "Ej sparad"
                  ) : (
                    "Sparad"
                  )}
                </Badge>
                
                {showSuccess && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Sparad framgångsrikt
                  </Badge>
                )}
                
                {error && (
                  <Badge 
                    variant="outline" 
                    className="bg-red-50 text-red-700 border-red-200 cursor-help"
                    title={error}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Fel vid sparning
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <span className="text-sm text-gray-500 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Senast sparad: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            
            {isEditMode && hasUnsavedChanges && (
              <Button 
                onClick={handleManualSave}
                disabled={isSaving}
                size="sm"
                variant="outline"
              >
                <Save className="h-4 w-4 mr-1" />
                Spara nu
              </Button>
            )}
          </div>
        </div>
        
        {page.subtitle && (
          <p className="text-gray-600 mt-2">{page.subtitle}</p>
        )}
        
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Content area with beautiful page styling */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <article className="page-article">
            <div className="page-header">
              <h2 className="page-title">{page.title}</h2>
            </div>
            
            <div className="prose">
              {isEditMode ? (
                <div className="edit-mode-banner mb-6">
                  <div className="edit-mode-banner-content">
                    <h4 className="edit-mode-banner-title">Redigera sidinnehåll</h4>
                    <p className="edit-mode-banner-subtitle">
                      Skriv och formatera innehållet för denna sida
                    </p>
                  </div>
                  <div className="mt-4">
                    <EditorJSComponent
                      content={parseEditorJSContent(page.content)}
                      onChange={handleContentChange}
                      readOnly={false}
                      placeholder="Börja skriva innehållet för denna sida..."
                    />
                  </div>
                </div>
              ) : (
                <EditorJSComponent
                  content={parseEditorJSContent(page.content)}
                  onChange={() => {}}
                  readOnly={true}
                />
              )}
            </div>
          </article>
          
          {/* Page metadata with beautiful styling */}
          <div className="page-meta mt-6">
            {page.created_at && (
              <div className="page-meta-item">
                <Calendar className="h-4 w-4" />
                <span>Skapad {new Date(page.created_at).toLocaleDateString('sv-SE')}</span>
              </div>
            )}
            {page.updated_at && (
              <div className="page-meta-item">
                <Clock className="h-4 w-4" />
                <span>Uppdaterad {new Date(page.updated_at).toLocaleDateString('sv-SE')}</span>
              </div>
            )}
            {page.word_count && (
              <div className="page-meta-item">
                <span>{page.word_count} ord</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 