import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const createId = (text: string): string => {
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  const parseMarkdown = (text: string): string => {
    let html = text;

    // Convert headings with IDs
    html = html.replace(/^# (.*$)/gim, (match, title) => {
      const id = createId(title);
      return `<h1 id="${id}" class="text-3xl font-bold text-gray-900 mb-6 scroll-mt-8">${title}</h1>`;
    });

    html = html.replace(/^## (.*$)/gim, (match, title) => {
      const id = createId(title);
      return `<h2 id="${id}" class="text-2xl font-semibold text-gray-800 mb-4 mt-8 scroll-mt-8">${title}</h2>`;
    });

    html = html.replace(/^### (.*$)/gim, (match, title) => {
      const id = createId(title);
      return `<h3 id="${id}" class="text-xl font-medium text-gray-700 mb-3 mt-6 scroll-mt-8">${title}</h3>`;
    });

    // Convert other markdown elements
    html = html
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/gim, '<em class="italic">$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">$1</code>')
      
      // Checkboxes
      .replace(/^- \[ \] (.*)$/gim, '<li class="flex items-center gap-2 mb-2"><input type="checkbox" disabled class="rounded border-gray-300"> <span class="text-gray-600">$1</span></li>')
      .replace(/^- \[x\] (.*)$/gim, '<li class="flex items-center gap-2 mb-2"><input type="checkbox" checked disabled class="rounded border-gray-300"> <span class="text-gray-600 line-through">$1</span></li>')
      
      // Regular lists
      .replace(/^- (.*$)/gim, '<li class="text-gray-600 mb-2">• $1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li class="text-gray-600 mb-2">$1. $2</li>')
      
      // Emojis with checkmarks and X marks
      .replace(/✅ \*\*(.*?)\*\*/gim, '<div class="flex items-center gap-2 mb-2"><span class="text-green-500">✅</span><strong class="text-gray-900">$1</strong></div>')
      .replace(/❌ \*\*(.*?)\*\*/gim, '<div class="flex items-center gap-2 mb-2"><span class="text-red-500">❌</span><strong class="text-gray-900">$1</strong></div>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Blockquotes
      .replace(/^> (.*)$/gim, '<blockquote class="border-l-4 border-blue-200 pl-4 italic text-gray-700 bg-blue-50 p-4 rounded-r-lg mb-4">$1</blockquote>')
      
      // Convert line breaks and paragraphs
      .replace(/\n\n/gim, '</p><p class="text-gray-600 mb-4 leading-relaxed">')
      .replace(/^(?!<[h|u|l|d|b])(.+)$/gim, '<p class="text-gray-600 mb-4 leading-relaxed">$1</p>');

    // Wrap consecutive list items in ul tags
    html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, '<ul class="list-none space-y-2 mb-6 ml-4">$&</ul>');

    return html;
  };

  return (
    <div 
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}; 