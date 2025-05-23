"use client";

import React from 'react';
import { ModernHandbookClient } from './handbook/ModernHandbookClient';

interface HandbookClientProps {
  handbook: {
    id: string;
    name: string;
    sections: Array<{
      id: string;
      title: string;
      description: string;
      pages: Array<{
        id: string;
        title: string;
        content: string;
      }>;
    }>;
  };
}

export default function HandbookClient({ handbook }: HandbookClientProps) {
  // Anpassa data för den nya komponenten
  const handbookData = {
    title: handbook.name,
    sections: handbook.sections.map(section => ({
      ...section,
      order: 1, // Default order
      isActive: true, // Default active
      pages: section.pages.map(page => ({
        ...page,
        order: 1 // Default order
      }))
    }))
  };

  return (
    <ModernHandbookClient handbookData={handbookData} />
  );
} 