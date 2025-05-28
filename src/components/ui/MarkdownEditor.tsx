import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { MarkdownRenderer } from '../handbook/MarkdownRenderer';
import { 
  Eye, 
  Edit3, 
  HelpCircle, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Link,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

const MarkdownHelp = () => (
  <div className="text-xs text-gray-600 space-y-2">
    <div className="font-medium text-gray-700">Snabbguide för Markdown:</div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <code className="bg-gray-100 px-1 rounded"># Stor rubrik</code>
      </div>
      <div>
        <code className="bg-gray-100 px-1 rounded">## Mindre rubrik</code>
      </div>
      <div>
        <code className="bg-gray-100 px-1 rounded">**fet text**</code>
      </div>
      <div>
        <code className="bg-gray-100 px-1 rounded">*kursiv text*</code>
      </div>
      <div>
        <code className="bg-gray-100 px-1 rounded">- Lista</code>
      </div>
      <div>
        <code className="bg-gray-100 px-1 rounded">1. Numrerad lista</code>
      </div>
      <div>
        <code className="bg-gray-100 px-1 rounded">[länk](url)</code>
      </div>
      <div>
        <code className="bg-gray-100 px-1 rounded">&gt; Citat</code>
      </div>
    </div>
  </div>
);

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  placeholder = 'Skriv ditt innehåll här...',
  className = '',
  disabled = false,
  rows = 8
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showHelp, setShowHelp] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Helper function to insert text at cursor position
  const insertAtCursor = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newText = content.substring(0, start) + before + textToInsert + after + content.substring(end);
    onChange(newText);

    // Set cursor position after the inserted text
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  // Helper function to insert text at beginning of line
  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lines = content.split('\n');
    let currentPos = 0;
    let lineIndex = 0;

    // Find which line the cursor is on
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= start) {
        lineIndex = i;
        break;
      }
      currentPos += lines[i].length + 1; // +1 for newline
    }

    // Insert prefix at beginning of current line
    lines[lineIndex] = prefix + lines[lineIndex];
    const newContent = lines.join('\n');
    onChange(newContent);

    // Set cursor position
    setTimeout(() => {
      const newCursorPos = start + prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const formatButtons = [
    {
      icon: Bold,
      label: 'Fet',
      action: () => insertAtCursor('**', '**', 'fet text'),
    },
    {
      icon: Italic,
      label: 'Kursiv',
      action: () => insertAtCursor('*', '*', 'kursiv text'),
    },
    {
      icon: Heading1,
      label: 'H1',
      action: () => insertAtLineStart('# '),
    },
    {
      icon: Heading2,
      label: 'H2',
      action: () => insertAtLineStart('## '),
    },
    {
      icon: List,
      label: 'Lista',
      action: () => insertAtLineStart('- '),
    },
    {
      icon: ListOrdered,
      label: 'Numrerad',
      action: () => insertAtLineStart('1. '),
    },
    {
      icon: Quote,
      label: 'Citat',
      action: () => insertAtLineStart('> '),
    },
    {
      icon: Link,
      label: 'Länk',
      action: () => insertAtCursor('[', '](url)', 'länktext'),
    },
  ];

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
            {/* Toolbar toggle for mobile */}
            {activeTab === 'edit' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowToolbar(!showToolbar)}
                className="h-8 px-2 sm:hidden"
                title={showToolbar ? "Dölj verktygsfält" : "Visa verktygsfält"}
              >
                {showToolbar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
            
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

        {/* Formatting Toolbar - only show in edit mode and when not collapsed on mobile */}
        {activeTab === 'edit' && (showToolbar || !isMobile) && (
          <div className="border-b border-gray-200 p-2 sm:p-3 bg-gray-50">
            <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1 sm:gap-2">
              {formatButtons.map((button, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={button.action}
                  disabled={disabled}
                  className="h-9 sm:h-8 px-2 sm:px-3 hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center justify-center sm:justify-start gap-1 sm:gap-2"
                  title={button.label}
                >
                  <button.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs font-medium">{button.label}</span>
                </Button>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500 hidden sm:block">
              💡 Tips: Markera text först för att formatera den, eller klicka för att lägga till ny formatering
            </div>
          </div>
        )}

        {/* Help section */}
        {showHelp && (
          <div className="border-b border-gray-200 p-3 bg-gray-50">
            <MarkdownHelp />
          </div>
        )}

        {/* Content areas */}
        <TabsContent value="edit" className="m-0">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="border-0 rounded-none resize-none focus:ring-0 font-mono editor-textarea"
            style={{
              fontSize: isMobile ? '16px' : '14px',
              minHeight: isMobile ? '200px' : `${rows * 1.5}rem`,
              maxHeight: isMobile ? '60vh' : 'none'
            }}
            rows={isMobile ? 6 : rows}
            disabled={disabled}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div className="p-4 min-h-[200px] bg-white editor-preview max-h-[60vh] sm:max-h-none overflow-y-auto">
            {content ? (
              <div className="prose prose-gray max-w-none prose-sm sm:prose-base">
                <MarkdownRenderer content={content} />
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