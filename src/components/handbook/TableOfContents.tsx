import React, { useMemo } from 'react';

interface TableOfContentsProps {
  content: string;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
  const tocItems = useMemo(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: TOCItem[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      
      items.push({ id, text, level });
    }

    return items;
  }, [content]);

  const handleScrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (tocItems.length <= 1) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-lg">📋</span>
        Innehållsförteckning
      </h3>
      <nav className="space-y-2">
        {tocItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleScrollToHeading(item.id)}
            className={`
              block w-full text-left py-1 px-2 rounded text-sm transition-colors hover:bg-blue-50 hover:text-blue-600
              ${item.level === 1 ? 'font-medium text-gray-900' : ''}
              ${item.level === 2 ? 'ml-4 text-gray-700' : ''}
              ${item.level === 3 ? 'ml-8 text-gray-600' : ''}
              ${item.level >= 4 ? 'ml-12 text-gray-500' : ''}
            `}
          >
            {item.text}
          </button>
        ))}
      </nav>
    </div>
  );
}; 