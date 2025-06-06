'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Save, HelpCircle } from 'lucide-react';
import { sanitizeEditorJSData, isValidEditorJSData } from '@/lib/utils/editorjs';

interface OutputData {
  time?: number;
  blocks: Array<{
    id?: string;
    type: string;
    data: any;
  }>;
  version?: string;
}

interface EditorJSComponentProps {
  content: OutputData;
  onChange: (data: OutputData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  handbookId?: string;
}

const EditorJSHelp = () => (
  <div className="text-sm text-gray-600 space-y-2">
    <h4 className="font-medium text-gray-900">Kortkommandon & Funktioner</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <div><kbd className="bg-gray-100 px-1 rounded">Tab</kbd> - Redigera block</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Enter</kbd> - Nytt block</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Backspace</kbd> - Ta bort block</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Cmd+B</kbd> - Fet text</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Cmd+I</kbd> - Kursiv text</div>
      <div><kbd className="bg-gray-100 px-1 rounded">/</kbd> - Öppna block-meny</div>
      <div><kbd className="bg-gray-100 px-1 rounded">@</kbd> - Länka användare</div>
    </div>
    <div className="pt-2 border-t">
      <p className="font-medium">Hur du tar bort innehåll:</p>
      <p className="text-xs text-gray-500 mb-2">
        • <strong>Bilder/Filer:</strong> Klicka på blocket → tryck <kbd className="bg-gray-100 px-1 rounded">Backspace</kbd> eller använd 3-punkt menyn
      </p>
      <p className="text-xs text-gray-500 mb-2">
        • <strong>Text:</strong> Placera cursor i början av blocket → tryck <kbd className="bg-gray-100 px-1 rounded">Backspace</kbd>
      </p>
      <p className="font-medium">Tillgängliga block:</p>
      <p className="text-xs text-gray-500">Rubriker, Paragraf, Lista, Citat, Kod, Tabell, Länk, <span className="font-medium text-blue-600">Bild</span>, <span className="font-medium text-green-600">Dokument</span>, Varning</p>
      <p className="text-xs text-blue-600 mt-1">💡 Bilder: Stöder JPEG, PNG, GIF, WebP (max 5MB) - <span className="font-semibold text-orange-600">endast admin</span></p>
      <p className="text-xs text-green-600">📎 Dokument: Stöder PDF, Word, Excel, PowerPoint, text, CSV (max 10MB) - <span className="font-semibold text-orange-600">endast admin</span></p>
    </div>
  </div>
);

export const EditorJSComponent: React.FC<EditorJSComponentProps> = ({
  content,
  onChange,
  placeholder = 'Börja skriva ditt innehåll...',
  className = '',
  disabled = false,
  readOnly = false,
  handbookId
}) => {
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper functions - moved before useEffect to avoid hoisting issues
  const isValidBlock = (block: any) => {
    if (!block || typeof block !== 'object') {
      return false;
    }
    
    // Check required properties
    if (!block.type || typeof block.type !== 'string') {
      return false;
    }
    
    // Ensure data exists (can be empty object)
    if (block.data === undefined || block.data === null) {
      return false;
    }
    
    // Block ID should be string if it exists
    if (block.id !== undefined && typeof block.id !== 'string') {
      return false;
    }
    
    return true;
  };

  // Safe block removal function to prevent "Can't find a Block to remove" error
  const safeRemoveInvalidBlocks = async (outputData: OutputData) => {
    if (!editorRef.current || !outputData.blocks) {
      return outputData;
    }

    try {
      // Add safety check to prevent infinite loops during editor operations
      if (!editorRef.current.readOnly && typeof editorRef.current.save === 'function') {
        // Get current blocks from editor
        const currentData = await editorRef.current.save();
        const currentBlocks = currentData.blocks || [];
        
        // Create a map of current block IDs for quick lookup
        const currentBlockIds = new Set(
          currentBlocks
            .map((block: any) => block.id)
            .filter((id: any) => id !== undefined)
        );
        
        // Filter out blocks that don't exist in the current editor state
        const validBlocks = outputData.blocks.filter((block: any) => {
          if (!isValidBlock(block)) {
            console.warn('Removing invalid block:', block);
            return false;
          }
          
          // If block has an ID, make sure it exists in current editor
          if (block.id && !currentBlockIds.has(block.id)) {
            console.warn(`Block with ID ${block.id} not found in current editor state, removing from output`);
            return false;
          }
          
          return true;
        });
        
        return {
          ...outputData,
          blocks: validBlocks
        };
      } else {
        // If editor is read-only or save is not available, just do basic validation
        console.warn('Editor is read-only or save not available, using basic validation');
        return {
          ...outputData,
          blocks: outputData.blocks?.filter(isValidBlock) || []
        };
      }
    } catch (error) {
      console.error('Error in safe block removal, falling back to basic validation:', error);
      // Fall back to basic validation without editor state checking
      return {
        ...outputData,
        blocks: outputData.blocks?.filter(isValidBlock) || []
      };
    }
  };

  // Enhanced clear function that safely removes blocks to prevent EditorJS errors
  const safeClearEditor = async () => {
    if (!editorRef.current) return;
    
    try {
      // Check if editor has blocks before attempting to clear
      const currentData = await editorRef.current.save();
      
      if (currentData && currentData.blocks && currentData.blocks.length > 0) {
        // Try to clear the editor safely
        await editorRef.current.clear();
      }
    } catch (error) {
      console.warn('Error during safe clear, attempting alternative method:', error);
      
      // Alternative approach: render empty content instead of clearing
      try {
        await editorRef.current.render({
          blocks: []
        });
      } catch (renderError) {
        console.error('Both clear methods failed:', renderError);
        // Last resort: reinitialize editor
        try {
          await editorRef.current.destroy();
          editorRef.current = null;
          setIsReady(false);
        } catch (destroyError) {
          console.error('Failed to destroy editor:', destroyError);
        }
      }
    }
  };

  // Enhanced render function that prevents block conflicts
  const safeRenderContent = async (contentToRender: OutputData) => {
    if (!editorRef.current) return;
    
    try {
      // Validate content before rendering
      const validContent = sanitizeEditorJSData(contentToRender);
      
      // Clear editor first, then render new content
      await safeClearEditor();
      
      // Small delay to allow DOM to settle after clear
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (editorRef.current && typeof editorRef.current.render === 'function') {
        await editorRef.current.render(validContent);
      }
    } catch (error) {
      console.error('Error in safe render:', error);
      
      // If render fails, try to reinitialize
      try {
        if (editorRef.current && typeof editorRef.current.destroy === 'function') {
          await editorRef.current.destroy();
          editorRef.current = null;
          setIsReady(false);
        }
      } catch (destroyError) {
        console.error('Error during safe re-initialization:', destroyError);
      }
    }
  };

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Clear any pending auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      
      // Destroy editor if it exists
      if (editorRef.current) {
        try {
          if (typeof editorRef.current.destroy === 'function') {
            editorRef.current.destroy();
          }
        } catch (error) {
          console.warn('Error destroying editor during cleanup:', error);
        } finally {
          editorRef.current = null;
        }
      }
    };
  }, []);

  // Check if we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check for mobile
  useEffect(() => {
    if (!isClient) return;
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isClient]);

  // Initialize Editor.js
  useEffect(() => {
    if (!isClient || !editorContainerRef.current) return;

    const initEditor = async () => {
      try {
        // Ensure container still exists
        if (!editorContainerRef.current) {
          console.warn('Editor container not found, skipping initialization');
          return;
        }

        // Destroy existing editor if it exists
        if (editorRef.current) {
          try {
            if (typeof editorRef.current.destroy === 'function') {
              await editorRef.current.destroy();
            }
          } catch (error) {
            console.warn('Error destroying previous editor:', error);
          }
          editorRef.current = null;
        }

        // Check for storage access before initializing EditorJS
        let hasStorageAccess = false;
        try {
          // Test localStorage access with more comprehensive check
          const testKey = '__editorjs_storage_test__';
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(testKey, 'test');
            const testValue = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            hasStorageAccess = testValue === 'test';
          }
        } catch (storageError) {
          console.warn('localStorage access limited, EditorJS will use memory storage:', storageError);
          hasStorageAccess = false;
        }

        // Dynamic imports with error handling
        let EditorJS, Header, List, Quote, Code, Delimiter, Table, Link, InlineCode, Marker, Underline, Warning, Image, AttachesTool;
        
        try {
          const imports = await Promise.all([
            import('@editorjs/editorjs'),
            import('@editorjs/header'),
            import('@editorjs/list'),
            import('@editorjs/quote'),
            import('@editorjs/code'),
            import('@editorjs/delimiter'),
            import('@editorjs/table'),
            import('@editorjs/link'),
            import('@editorjs/inline-code'),
            import('@editorjs/marker'),
            import('@editorjs/underline'),
            import('@editorjs/warning'),
            import('@editorjs/image'),
            import('@editorjs/attaches'),
          ]);
          
          [
            EditorJS,
            Header,
            List,
            Quote,
            Code,
            Delimiter,
            Table,
            Link,
            InlineCode,
            Marker,
            Underline,
            Warning,
            Image,
            AttachesTool,
          ] = imports.map(module => module.default);
          
        } catch (importError) {
          console.error('Failed to import EditorJS modules:', importError);
          return; // Exit if we can't load required modules
        }

        // Sanitize initial content
        const initialContent = sanitizeEditorJSData(content);

        const editor = new EditorJS({
          holder: editorContainerRef.current,
          data: initialContent,
          placeholder: placeholder,
          minHeight: 200,
          readOnly: readOnly || disabled,
          autofocus: false,
          logLevel: 'ERROR',
          // Add storage configuration
          defaultBlock: 'paragraph',
          sanitizer: {
            p: {
              br: true,
            },
          },
          // Conditional onChange based on storage availability
          ...(hasStorageAccess ? {
            onChange: async () => {
              // CRITICAL: Only call save() if the editor is NOT in read-only mode
              if (editorRef.current && !readOnly && !disabled) {
                try {
                  const outputData = await editorRef.current.save();
                  
                  // Validate output data before calling onChange
                  if (isValidEditorJSData(outputData)) {
                    try {
                      // Use safe block removal to prevent "Can't find a Block to remove" errors
                      const cleanedData = await safeRemoveInvalidBlocks(outputData);
                      
                      // Clear previous timer if it exists
                      if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                      }
                      
                      // Use debounce timer to prevent excessive updates
                      debounceTimerRef.current = setTimeout(async () => {
                        try {
                          onChange(cleanedData);
                          setHasUnsavedChanges(true);
                          
                          // Auto-hide the "saving" message after 3 seconds
                          if (autoSaveTimerRef.current) {
                            clearTimeout(autoSaveTimerRef.current);
                          }
                          autoSaveTimerRef.current = setTimeout(() => {
                            setHasUnsavedChanges(false);
                          }, 3000);
                        } catch (callbackError) {
                          console.error('Error in onChange callback:', callbackError);
                        } finally {
                          debounceTimerRef.current = null;
                        }
                      }, 1000); // 1 second delay to prevent excessive updates
                    } catch (blockError) {
                      console.warn('Block validation failed, using basic validation:', blockError);
                      // Fallback to basic validation if safe block removal fails
                      const basicCleanedData = {
                        ...outputData,
                        blocks: outputData.blocks?.filter(isValidBlock) || []
                      };
                      
                      // Clear previous timer if it exists
                      if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                      }
                      
                      debounceTimerRef.current = setTimeout(async () => {
                        try {
                          onChange(basicCleanedData);
                          setHasUnsavedChanges(true);
                          
                          // Auto-hide the "saving" message after 3 seconds
                          if (autoSaveTimerRef.current) {
                            clearTimeout(autoSaveTimerRef.current);
                          }
                          autoSaveTimerRef.current = setTimeout(() => {
                            setHasUnsavedChanges(false);
                          }, 3000);
                        } catch (callbackError) {
                          console.error('Error in fallback onChange callback:', callbackError);
                        } finally {
                          debounceTimerRef.current = null;
                        }
                      }, 1000);
                    }
                  } else {
                    console.warn('Invalid output data from editor:', outputData);
                  }
                } catch (error) {
                  console.error('Error saving editor data:', error);
                  // Special handling for block removal errors
                  if (error instanceof Error && error.message.includes("Can't find a Block to remove")) {
                    console.warn('Block removal error detected, attempting editor recovery...');
                    try {
                      // Try to reinitialize the editor
                      await editorRef.current.destroy();
                      editorRef.current = null;
                      setIsReady(false);
                      // The useEffect will reinitialize the editor
                    } catch (reinitError) {
                      console.error('Failed to reinitialize editor after block error:', reinitError);
                    }
                  }
                  // Don't crash, just log the error and continue
                }
              }
            }
          } : {}),
          tools: {
            header: {
              class: Header,
              inlineToolbar: true,
              config: {
                placeholder: 'Skriv rubrik...',
                levels: [1, 2, 3, 4],
                defaultLevel: 2
              }
            },
            image: {
              class: Image,
              config: {
                endpoints: {
                  byFile: '/api/upload-image',
                },
                field: 'image',
                types: 'image/*',
                captionPlaceholder: 'Bildtext (valfritt)',
                buttonContent: 'Välj bild...',
                uploader: {
                  uploadByFile: async (file: File) => {
                    const formData = new FormData();
                    formData.append('image', file);
                    if (handbookId) {
                      formData.append('handbook_id', handbookId);
                    }
                    
                    try {
                      const response = await fetch('/api/upload-image', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include' // Include cookies for auth
                      });
                      
                      const result = await response.json();
                      
                      if (result.success === 1) {
                        return result;
                      } else {
                        // Handle specific error types
                        if (response.status === 401) {
                          throw new Error('Du måste vara inloggad för att ladda upp bilder');
                        } else if (response.status === 403) {
                          throw new Error('Du måste vara admin för denna handbok för att ladda upp bilder');
                        } else {
                          throw new Error(result.message || 'Uppladdning misslyckades');
                        }
                      }
                    } catch (error) {
                      console.error('Image upload error:', error);
                      // Show user-friendly error message
                      alert(`Bilduppladdning misslyckades: ${error instanceof Error ? error.message : 'Okänt fel'}`);
                      throw error;
                    }
                  }
                }
              }
            },
            attaches: {
              class: AttachesTool,
              config: {
                endpoint: '/api/upload-document',
                field: 'file',
                types: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/csv',
                buttonText: 'Välj dokument...',
                errorMessage: 'Kunde inte ladda upp dokumentet. Kontrollera att det är ett giltigt format och under 10MB.',
                uploader: {
                  uploadByFile: async (file: File) => {
                    const formData = new FormData();
                    formData.append('file', file);
                    if (handbookId) {
                      formData.append('handbook_id', handbookId);
                    }
                    
                    try {
                      const response = await fetch('/api/upload-document', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include' // Include cookies for auth
                      });
                      
                      const result = await response.json();
                      
                      if (result.success === 1) {
                        return result;
                      } else {
                        // Handle specific error types
                        if (response.status === 401) {
                          throw new Error('Du måste vara inloggad för att ladda upp dokument');
                        } else if (response.status === 403) {
                          throw new Error('Du måste vara admin för denna handbok för att ladda upp dokument');
                        } else {
                          throw new Error(result.message || 'Uppladdning misslyckades');
                        }
                      }
                    } catch (error) {
                      console.error('Document upload error:', error);
                      // Show user-friendly error message
                      alert(`Dokumentuppladdning misslyckades: ${error instanceof Error ? error.message : 'Okänt fel'}`);
                      throw error;
                    }
                  }
                }
              }
            },
            list: {
              class: List,
              inlineToolbar: true,
              config: {
                defaultStyle: 'unordered'
              }
            },
            quote: {
              class: Quote,
              inlineToolbar: true,
              config: {
                quotePlaceholder: 'Skriv citat...',
                captionPlaceholder: 'Källa (valfritt)',
              }
            },
            code: {
              class: Code,
              config: {
                placeholder: 'Skriv kod...'
              }
            },
            warning: {
              class: Warning,
              inlineToolbar: true,
              config: {
                titlePlaceholder: 'Varningens titel...',
                messagePlaceholder: 'Varningens meddelande...'
              }
            },
            delimiter: Delimiter,
            table: {
              class: Table,
              inlineToolbar: true,
              config: {
                rows: 2,
                cols: 3
              }
            },
            link: {
              class: Link,
              config: {
                endpoint: '/api/link-preview'
              }
            },
            inlineCode: {
              class: InlineCode
            },
            marker: {
              class: Marker
            },
            underline: {
              class: Underline
            }
          },
          onReady: () => {
            try {
              setIsReady(true);
              console.log('EditorJS WYSIWYG is ready!', { 
                readOnly: readOnly || disabled,
                hasStorageAccess: hasStorageAccess 
              });
              
              // If storage is not available, set up manual change detection
              if (!hasStorageAccess && !readOnly && !disabled) {
                console.log('Setting up manual change detection due to storage limitations');
                // We could add keyboard/mouse event listeners here for manual saving
              }
            } catch (error) {
              console.error('Error in onReady callback:', error);
              setIsReady(true); // Still set ready even if there's an error
            }
          }
        });

        editorRef.current = editor;
      } catch (error) {
        console.error('Error initializing Editor.js:', error);
      }
    };

    initEditor();

    return () => {
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Clear any pending auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      
      if (editorRef.current) {
        try {
          // Check if editor is still mounted before destroying
          if (editorRef.current.destroy && typeof editorRef.current.destroy === 'function') {
            editorRef.current.destroy();
          }
          editorRef.current = null;
        } catch (error) {
          console.error('Error destroying editor:', error);
          // Force cleanup even if destroy fails
          editorRef.current = null;
        }
      }
    };
  }, [isClient, readOnly, disabled]);

  // Simple content update for read-only editors
  useEffect(() => {
    if (editorRef.current && isReady && (readOnly || disabled) && content) {
      const validContent = sanitizeEditorJSData(content);
      
      // Use the safe render function to prevent block conflicts
      safeRenderContent(validContent);
    }
  }, [content, isReady, readOnly, disabled]);

  const handleSave = async () => {
    if (editorRef.current && !disabled) {
      try {
        const outputData = await editorRef.current.save();
        
        // Validate output data and blocks
        if (isValidEditorJSData(outputData)) {
          // Use safe block removal to prevent errors
          const cleanedData = await safeRemoveInvalidBlocks(outputData);
          
          onChange(cleanedData);
          setHasUnsavedChanges(false);
        } else {
          console.warn('Invalid output data from editor:', outputData);
          alert('Det gick inte att spara innehållet - data är felformaterad.');
        }
      } catch (error) {
        console.error('Error saving:', error);
        // Show user-friendly error message
        alert('Det gick inte att spara innehållet. Försök igen.');
      }
    }
  };

  // Show loading state on server side
  if (!isClient) {
    return (
      <div className={`rounded-lg ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <span className="text-gray-500">Laddar WYSIWYG editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-white ${className}`}>
      {/* Simple header with controls */}
      {!readOnly && (
        <div className="border-b border-gray-200 p-2 sm:p-3 flex items-center justify-between flex-wrap gap-2 bg-gray-50">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 flex items-center">
                <div className="w-2 h-2 bg-amber-400 rounded-full mr-1"></div>
                Sparas automatiskt...
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1 h-8 px-2 sm:px-3"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Hjälp</span>
            </Button>
          </div>
        </div>
      )}

      {/* Help section */}
      {showHelp && (
        <div className="border-b border-gray-200 p-3 bg-blue-50">
          <EditorJSHelp />
        </div>
      )}

      {/* Main editor area */}
      <div className="min-h-[300px] p-4">
        <div 
          ref={editorContainerRef}
          className="editor-js-container prose prose-gray max-w-none"
          style={{
            minHeight: isMobile ? '250px' : '300px'
          }}
        />
        {!isReady && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Laddar WYSIWYG editor...</span>
          </div>
        )}
      </div>
    </div>
  );
}; 