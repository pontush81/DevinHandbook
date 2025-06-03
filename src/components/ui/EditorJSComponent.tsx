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
}

const EditorJSHelp = () => (
  <div className="text-sm text-gray-600 space-y-2">
    <h4 className="font-medium text-gray-900">Kortkommandon & Funktioner</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <div><kbd className="bg-gray-100 px-1 rounded">Tab</kbd> - Redigera block</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Enter</kbd> - Nytt block</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Cmd+B</kbd> - Fet text</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Cmd+I</kbd> - Kursiv text</div>
      <div><kbd className="bg-gray-100 px-1 rounded">/</kbd> - Öppna block-meny</div>
      <div><kbd className="bg-gray-100 px-1 rounded">@</kbd> - Länka användare</div>
    </div>
    <div className="pt-2 border-t">
      <p className="font-medium">Tillgängliga block:</p>
      <p className="text-xs text-gray-500">Rubriker, Paragraf, Lista, Citat, Kod, Tabell, Länk, Bild</p>
    </div>
  </div>
);

export const EditorJSComponent: React.FC<EditorJSComponentProps> = ({
  content,
  onChange,
  placeholder = 'Börja skriva ditt innehåll...',
  className = '',
  disabled = false,
  readOnly = false
}) => {
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
            editorRef.current.destroy();
          } catch (error) {
            console.warn('Error destroying previous editor:', error);
          }
          editorRef.current = null;
        }

        const EditorJS = (await import('@editorjs/editorjs')).default;
        const Header = (await import('@editorjs/header')).default;
        const List = (await import('@editorjs/list')).default;
        const Quote = (await import('@editorjs/quote')).default;
        const Code = (await import('@editorjs/code')).default;
        const Delimiter = (await import('@editorjs/delimiter')).default;
        const Table = (await import('@editorjs/table')).default;
        const Link = (await import('@editorjs/link')).default;
        const InlineCode = (await import('@editorjs/inline-code')).default;
        const Marker = (await import('@editorjs/marker')).default;
        const Underline = (await import('@editorjs/underline')).default;
        const Warning = (await import('@editorjs/warning')).default;

        // Sanitize initial content
        const initialContent = sanitizeEditorJSData(content);

        const editor = new EditorJS({
          holder: editorContainerRef.current,
          data: initialContent,
          placeholder: placeholder,
          minHeight: 200,
          readOnly: readOnly || disabled,
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
          onChange: async () => {
            // CRITICAL: Only call save() if the editor is NOT in read-only mode
            if (editorRef.current && !readOnly && !disabled) {
              try {
                const outputData = await editorRef.current.save();
                // Validate output data before calling onChange
                if (isValidEditorJSData(outputData)) {
                  // Clear previous timer if it exists
                  if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                  }
                  
                  // Use debounce timer to prevent excessive updates
                  debounceTimerRef.current = setTimeout(() => {
                    onChange(outputData);
                    setHasUnsavedChanges(true);
                    debounceTimerRef.current = null;
                  }, 1000); // 1 second delay to prevent excessive updates
                } else {
                  console.warn('Invalid output data from editor:', outputData);
                }
              } catch (error) {
                console.error('Error saving editor data:', error);
                // Don't crash, just log the error
              }
            }
          },
          onReady: () => {
            setIsReady(true);
            console.log('EditorJS WYSIWYG is ready!', { readOnly: readOnly || disabled });
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
      
      // For read-only, we don't need to check current content, just render
      editorRef.current.render(validContent).catch((error: any) => {
        console.error('Error rendering read-only content:', error);
      });
    }
  }, [content, isReady, readOnly, disabled]);

  const handleSave = async () => {
    if (editorRef.current && !disabled) {
      try {
        const outputData = await editorRef.current.save();
        // Validate output data before calling onChange
        if (isValidEditorJSData(outputData)) {
          onChange(outputData);
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
      <div className={`border border-gray-300 rounded-lg ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <span className="text-gray-500">Laddar WYSIWYG editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-lg bg-white ${className}`}>
      {/* Simple header with controls */}
      {!readOnly && (
        <div className="border-b border-gray-200 p-2 sm:p-3 flex items-center justify-between flex-wrap gap-2 bg-gray-50">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 flex items-center">
                <div className="w-2 h-2 bg-amber-400 rounded-full mr-1"></div>
                Osparade ändringar
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
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={disabled || !hasUnsavedChanges}
              className="flex items-center gap-1 h-8 px-2 sm:px-3"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Spara</span>
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