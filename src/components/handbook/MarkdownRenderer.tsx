import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const parseMarkdown = (text: string): string => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-gray-900 mb-6">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-gray-800 mb-4 mt-8">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium text-gray-700 mb-3 mt-6">$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/gim, '<em class="italic">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="text-gray-600 mb-2">$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li class="text-gray-600 mb-2">$2</li>')
      .replace(/(<li.*?<\/li>)/s, '<ul class="list-disc list-inside space-y-2 mb-6 ml-4">$1</ul>')
      .replace(/\n\n/gim, '</p><p class="text-gray-600 mb-4 leading-relaxed">')
      .replace(/^(?!<[h|u|l])(.+)$/gim, '<p class="text-gray-600 mb-4 leading-relaxed">$1</p>');
  };

  return (
    <div 
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}; 