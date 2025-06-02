'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Eye, Edit3, Save, HelpCircle } from 'lucide-react';

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
  content: OutputData | string;
  onChange: (data: OutputData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const EditorJSHelp = () => (
  <div className="text-sm text-gray-600 space-y-2">
    <h4 className="font-medium text-gray-900">Kortkommandon</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <div><kbd className="bg-gray-100 px-1 rounded">Tab</kbd> - Redigera block</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Enter</kbd> - Nytt block</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Cmd+B</kbd> - Fet text</div>
      <div><kbd className="bg-gray-100 px-1 rounded">Cmd+I</kbd> - Kursiv text</div>
    </div>
  </div>
);

const convertMarkdownToEditorJS = (content: string): OutputData => {
  if (!content || content.trim() === '') {
    return { blocks: [] };
  }

  const lines = content.split('\n');
  const blocks: any[] = [];
  let currentBlock = '';
  let currentType = 'paragraph';

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') {
      if (currentBlock.trim()) {
        blocks.push({
          type: currentType,
          data: currentType === 'paragraph' ? { text: currentBlock.trim() } : { text: currentBlock.trim() }
        });
        currentBlock = '';
        currentType = 'paragraph';
      }
      continue;
    }

    // Headers
    if (trimmedLine.startsWith('# ')) {
      if (currentBlock.trim()) {
        blocks.push({ type: currentType, data: { text: currentBlock.trim() } });
        currentBlock = '';
      }
      blocks.push({ type: 'header', data: { text: trimmedLine.slice(2), level: 1 } });
      currentType = 'paragraph';
    } else if (trimmedLine.startsWith('## ')) {
      if (currentBlock.trim()) {
        blocks.push({ type: currentType, data: { text: currentBlock.trim() } });
        currentBlock = '';
      }
      blocks.push({ type: 'header', data: { text: trimmedLine.slice(3), level: 2 } });
      currentType = 'paragraph';
    } else if (trimmedLine.startsWith('### ')) {
      if (currentBlock.trim()) {
        blocks.push({ type: currentType, data: { text: currentBlock.trim() } });
        currentBlock = '';
      }
      blocks.push({ type: 'header', data: { text: trimmedLine.slice(4), level: 3 } });
      currentType = 'paragraph';
    }
    // Lists
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (currentType !== 'list') {
        if (currentBlock.trim()) {
          blocks.push({ type: currentType, data: { text: currentBlock.trim() } });
          currentBlock = '';
        }
        currentType = 'list';
        currentBlock = trimmedLine.slice(2);
      } else {
        currentBlock += '\n' + trimmedLine.slice(2);
      }
    }
    // Quotes
    else if (trimmedLine.startsWith('> ')) {
      if (currentBlock.trim()) {
        blocks.push({ type: currentType, data: { text: currentBlock.trim() } });
        currentBlock = '';
      }
      blocks.push({ type: 'quote', data: { text: trimmedLine.slice(2) } });
      currentType = 'paragraph';
    }
    // Code blocks
    else if (trimmedLine.startsWith('```')) {
      if (currentType === 'code') {
        blocks.push({ type: 'code', data: { code: currentBlock } });
        currentBlock = '';
        currentType = 'paragraph';
      } else {
        if (currentBlock.trim()) {
          blocks.push({ type: currentType, data: { text: currentBlock.trim() } });
          currentBlock = '';
        }
        currentType = 'code';
      }
    }
    // Regular text
    else {
      if (currentType === 'code') {
        currentBlock += line + '\n';
      } else {
        currentBlock += (currentBlock ? ' ' : '') + trimmedLine;
      }
    }
  }

  // Add final block
  if (currentBlock.trim()) {
    if (currentType === 'list') {
      blocks.push({ 
        type: 'list', 
        data: { 
          style: 'unordered',
          items: currentBlock.split('\n').filter(item => item.trim())
        } 
      });
    } else {
      blocks.push({ 
        type: currentType, 
        data: currentType === 'code' ? { code: currentBlock } : { text: currentBlock.trim() } 
      });
    }
  }

  return { blocks };
};

const convertEditorJSToMarkdown = (data: OutputData): string => {
  if (!data || !data.blocks) return '';

  return data.blocks.map(block => {
    switch (block.type) {
      case 'header':
        const level = '#'.repeat(block.data.level || 1);
        return `${level} ${block.data.text}`;
      case 'paragraph':
        return block.data.text || '';
      case 'list':
        if (block.data.items) {
          return block.data.items.map((item: string) => `- ${item}`).join('\n');
        }
        return `- ${block.data.text || ''}`;
      case 'quote':
        return `> ${block.data.text || ''}`;
      case 'code':
        return `\`\`\`\n${block.data.code || ''}\n\`\`\``;
      case 'delimiter':
        return '---';
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
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showHelp, setShowHelp] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // Check if we're on client side
  useEffect(() => {
    setIsClient(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize editor only on client side
  useEffect(() => {
    if (!isClient || !editorContainerRef.current) return;

    const initEditor = async () => {
      try {
        // Dynamically import EditorJS and tools
        const [
          { default: EditorJS },
          { default: Header },
          { default: List },
          { default: Quote },
          { default: Delimiter },
          { default: Table },
          { default: Code },
          { default: Link },
          { default: Checklist },
          { default: Warning },
          { default: InlineCode },
          { default: Marker },
          { default: Underline }
        ] = await Promise.all([
          import('@editorjs/editorjs'),
          import('@editorjs/header'),
          import('@editorjs/list'),
          import('@editorjs/quote'),
          import('@editorjs/delimiter'),
          import('@editorjs/table'),
          import('@editorjs/code'),
          import('@editorjs/link'),
          import('@editorjs/checklist'),
          import('@editorjs/warning'),
          import('@editorjs/inline-code'),
          import('@editorjs/marker'),
          import('@editorjs/underline')
        ]);

        const editor = new EditorJS({
          holder: editorContainerRef.current!,
          placeholder,
          readOnly,
          data: typeof content === 'string' ? convertMarkdownToEditorJS(content) : content,
          tools: {
            header: {
              class: Header,
              config: {
                placeholder: 'Rubrik...',
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
                quotePlaceholder: 'Citat...',
                captionPlaceholder: 'Källa...'
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
            if (editorRef.current) {
              try {
                const outputData = await editorRef.current.save();
                onChange(outputData);
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
  }, [isClient]);

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

  // Show loading state on server side
  if (!isClient) {
    return (
      <div className={`border border-gray-300 rounded-lg ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <span className="text-gray-500">Laddar editor...</span>
        </div>
      </div>
    );
  }

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