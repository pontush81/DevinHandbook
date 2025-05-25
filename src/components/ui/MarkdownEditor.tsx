import React, { useState, useRef } from 'react';
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
  Separator
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      label: 'Fet text',
      action: () => insertAtCursor('**', '**', 'fet text'),
    },
    {
      icon: Italic,
      label: 'Kursiv text',
      action: () => insertAtCursor('*', '*', 'kursiv text'),
    },
    {
      icon: Heading1,
      label: 'Stor rubrik',
      action: () => insertAtLineStart('# '),
    },
    {
      icon: Heading2,
      label: 'Mindre rubrik',
      action: () => insertAtLineStart('## '),
    },
    {
      icon: List,
      label: 'Punktlista',
      action: () => insertAtLineStart('- '),
    },
    {
      icon: ListOrdered,
      label: 'Numrerad lista',
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
        <div className="border-b border-gray-200 p-2 flex items-center justify-between">
          <TabsList className="grid w-auto grid-cols-2">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Redigera
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Förhandsgranska
            </TabsTrigger>
          </TabsList>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1"
          >
            <HelpCircle className="w-4 h-4" />
            Hjälp
          </Button>
        </div>

        {/* Formatting Toolbar - only show in edit mode */}
        {activeTab === 'edit' && (
          <div className="border-b border-gray-200 p-3 bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {formatButtons.map((button, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={button.action}
                  disabled={disabled}
                  className="h-9 px-3 hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center gap-2"
                  title={button.label}
                >
                  <button.icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{button.label}</span>
                </Button>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              💡 Tips: Markera text först för att formatera den, eller klicka för att lägga till ny formatering
            </div>
          </div>
        )}

        {showHelp && (
          <div className="border-b border-gray-200 p-3 bg-gray-50">
            <MarkdownHelp />
          </div>
        )}

        <TabsContent value="edit" className="m-0">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="border-0 rounded-none resize-none focus:ring-0 font-mono text-sm"
            rows={rows}
            disabled={disabled}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div className="p-4 min-h-[200px] bg-white">
            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <div className="text-gray-400 italic">Inget innehåll att förhandsgranska</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 