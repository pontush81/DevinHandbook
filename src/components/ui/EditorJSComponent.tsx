'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import Quote from '@editorjs/quote';
import Link from '@editorjs/link';
import Image from '@editorjs/image';
import Checklist from '@editorjs/checklist';
import Code from '@editorjs/code';
import Table from '@editorjs/table';
import Delimiter from '@editorjs/delimiter';
import Warning from '@editorjs/warning';
import InlineCode from '@editorjs/inline-code';
import Marker from '@editorjs/marker';
import Underline from '@editorjs/underline';
import { Button } from './button';
import { Eye, Edit3, Save, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

interface EditorJSComponentProps {
  content: OutputData | string;
  onChange: (data: OutputData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const EditorJSHelp = () => (
  <div className="text-xs text-gray-600 space-y-2">
    <div className="font-medium text-gray-700">Editor.js Tips:</div>
    <div className="space-y-1">
      <div>• Tryck <kbd className="bg-gray-100 px-1 rounded">Tab</kbd> för att se alla tillgängliga block-typer</div>
      <div>• Tryck <kbd className="bg-gray-100 px-1 rounded">/</kbd> för att söka efter block-typer</div>
      <div>• Markera text för att formatera (fet, kursiv, länk)</div>
      <div>• Dra och släpp för att flytta block</div>
      <div>• Tryck <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> för ny paragraf</div>
    </div>
  </div>
);

// Convert markdown-like string to Editor.js data
const convertMarkdownToEditorJS = (content: string): OutputData => {
  if (!content || typeof content !== 'string') {
    return { blocks: [], version: '2.29.1' };
  }

  const lines = content.split('\n').filter(line => line.trim() !== '');
  const blocks: any[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('# ')) {
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'header',
        data: {
          text: trimmedLine.slice(2),
          level: 1
        }
      });
    } else if (trimmedLine.startsWith('## ')) {
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'header',
        data: {
          text: trimmedLine.slice(3),
          level: 2
        }
      });
    } else if (trimmedLine.startsWith('### ')) {
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'header',
        data: {
          text: trimmedLine.slice(4),
          level: 3
        }
      });
    } else if (trimmedLine.startsWith('- ')) {
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'list',
        data: {
          style: 'unordered',
          items: [trimmedLine.slice(2)]
        }
      });
    } else if (trimmedLine.startsWith('1. ')) {
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'list',
        data: {
          style: 'ordered',
          items: [trimmedLine.slice(3)]
        }
      });
    } else if (trimmedLine.startsWith('> ')) {
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'quote',
        data: {
          text: trimmedLine.slice(2),
          caption: ''
        }
      });
    } else if (trimmedLine.startsWith('```')) {
      // Skip code blocks for now - would need multi-line parsing
      continue;
    } else if (trimmedLine.length > 0) {
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'paragraph',
        data: {
          text: trimmedLine
        }
      });
    }
  }

  return {
    blocks,
    version: '2.29.1'
  };
};

// Convert Editor.js data to markdown-like string for backwards compatibility
const convertEditorJSToMarkdown = (data: OutputData): string => {
  if (!data || !data.blocks) return '';

  return data.blocks.map(block => {
    switch (block.type) {
      case 'header':
        const level = '#'.repeat(block.data.level || 1);
        return `${level} ${block.data.text}`;
      case 'paragraph':
        return block.data.text;
      case 'list':
        if (block.data.style === 'ordered') {
          return block.data.items.map((item: string, index: number) => `${index + 1}. ${item}`).join('\n');
        } else {
          return block.data.items.map((item: string) => `- ${item}`).join('\n');
        }
      case 'quote':
        return `> ${block.data.text}`;
      case 'code':
        return `\`\`\`\n${block.data.code}\n\`\`\``;
      case 'checklist':
        return block.data.items.map((item: any) => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n');
      case 'warning':
        return `⚠️ ${block.data.title}\n${block.data.message}`;
      default:
        return block.data.text || '';
    }
  }).join('\n\n');
};

export const EditorJSComponent: React.FC<EditorJSComponentProps> = ({
  content,
  onChange,
  placeholder = 'Börja skriva ditt innehåll...',
  className = '',
  disabled = false,
  readOnly = false
}) => {
  const editorRef = useRef<EditorJS | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewContent, setPreviewContent] = useState('');
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

  // Initialize Editor.js
  useEffect(() => {
    if (!editorContainerRef.current || editorRef.current) return;

    const initEditor = async () => {
      try {
        let initialData: OutputData;

        if (typeof content === 'string') {
          initialData = convertMarkdownToEditorJS(content);
        } else if (content && content.blocks) {
          initialData = content;
        } else {
          initialData = {
            blocks: [
              {
                id: Math.random().toString(36).substr(2, 9),
                type: 'paragraph',
                data: {
                  text: ''
                }
              }
            ],
            version: '2.29.1'
          };
        }

        const editor = new EditorJS({
          holder: editorContainerRef.current!,
          placeholder: placeholder,
          readOnly: readOnly || disabled,
          data: initialData,
          tools: {
            header: {
              class: Header,
              config: {
                placeholder: 'Skriv en rubrik...',
                levels: [1, 2, 3, 4],
                defaultLevel: 1
              }
            },
            paragraph: {
              class: Paragraph,
              inlineToolbar: true,
              config: {
                placeholder: placeholder
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
                quotePlaceholder: 'Skriv en citat...',
                captionPlaceholder: 'Citatens författare'
              }
            },
            checklist: {
              class: Checklist,
              inlineToolbar: true
            },
            code: {
              class: Code,
              config: {
                placeholder: 'Skriv din kod här...'
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
                endpoint: '/api/link-preview' // You might want to implement this
              }
            },
            // Note: Image upload would need backend configuration
            // Inline tools
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
            if (editorRef.current) {
              try {
                const outputData = await editorRef.current.save();
                onChange(outputData);
                
                // Update preview content
                setPreviewContent(convertEditorJSToMarkdown(outputData));
              } catch (error) {
                console.error('Error saving editor data:', error);
              }
            }
          },
          onReady: () => {
            setIsReady(true);
            console.log('Editor.js is ready!');
          }
        });

        editorRef.current = editor;
      } catch (error) {
        console.error('Error initializing Editor.js:', error);
      }
    };

    initEditor();

    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
          editorRef.current = null;
        } catch (error) {
          console.error('Error destroying editor:', error);
        }
      }
    };
  }, []);

  // Update editor content when content prop changes
  useEffect(() => {
    if (editorRef.current && isReady) {
      let newData: OutputData;
      
      if (typeof content === 'string') {
        newData = convertMarkdownToEditorJS(content);
      } else if (content && content.blocks) {
        newData = content;
      } else {
        return;
      }

      editorRef.current.render(newData).catch(console.error);
      setPreviewContent(convertEditorJSToMarkdown(newData));
    }
  }, [content, isReady]);

  const handleSave = async () => {
    if (editorRef.current) {
      try {
        const outputData = await editorRef.current.save();
        onChange(outputData);
      } catch (error) {
        console.error('Error saving:', error);
      }
    }
  };

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}>
        {/* Header with tabs and controls */}
        <div className="border-b border-gray-200 p-2 sm:p-3 flex items-center justify-between flex-wrap gap-2">
          <TabsList className="grid w-auto grid-cols-2">
            <TabsTrigger value="edit" className="flex items-center gap-2 text-xs sm:text-sm">
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Redigera</span>
              <span className="sm:hidden">Edit</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2 text-xs sm:text-sm">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Förhandsgranska</span>
              <span className="sm:hidden">Preview</span>
            </TabsTrigger>
          </TabsList>
          
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
            
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={disabled}
                className="flex items-center gap-1 h-8 px-2 sm:px-3"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Spara</span>
              </Button>
            )}
          </div>
        </div>

        {/* Help section */}
        {showHelp && (
          <div className="border-b border-gray-200 p-3 bg-gray-50">
            <EditorJSHelp />
          </div>
        )}

        {/* Content areas */}
        <TabsContent value="edit" className="m-0">
          <div className="min-h-[300px] p-4">
            <div 
              ref={editorContainerRef}
              className="editor-js-container"
              style={{
                minHeight: isMobile ? '250px' : '300px'
              }}
            />
            {!isReady && (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">Laddar editor...</span>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div className="p-4 min-h-[300px] bg-white max-h-[60vh] sm:max-h-none overflow-y-auto">
            {previewContent ? (
              <div className="prose prose-gray max-w-none prose-sm sm:prose-base whitespace-pre-wrap">
                {previewContent}
              </div>
            ) : (
              <div className="text-gray-400 italic">Inget innehåll att förhandsgranska</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 