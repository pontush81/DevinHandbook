import React, { useCallback } from 'react';
import { EditorJSComponent } from './EditorJSComponent';
import { OutputData } from '@editorjs/editorjs';
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
      case 'delimiter':
        return '---';
      case 'table':
        // Simple table conversion - would need more complex logic for full table support
        return '[Tabell]';
      default:
        return block.data.text || '';
    }
  }).join('\n\n');
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  placeholder = 'Skriv ditt innehåll här...',
  className = '',
  disabled = false,
  rows = 8
}) => {
  const handleEditorChange = useCallback((data: OutputData) => {
    const markdownContent = convertEditorJSToMarkdown(data);
    onChange(markdownContent);
  }, [onChange]);

  return (
    <EditorJSComponent
      content={content}
      onChange={handleEditorChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      readOnly={disabled}
    />
  );
}; 