"use client";

import React from 'react';
import { HandbookTemplate, Section } from '@/lib/templates/handbook-template';
import { ModernHandbookClient } from './ModernHandbookClient';

console.log('🚀 HandbookClient.tsx IS BEING LOADED - NEW VERSION!');

interface HandbookClientProps {
  handbook: HandbookTemplate;
}

// Denna komponent fungerar som en adapter mellan den gamla HandbookTemplate-strukturen
// och den nya ModernHandbookClient som förväntar sig en enklare struktur
const HandbookClient: React.FC<HandbookClientProps> = ({ handbook }) => {
  console.log('[HandbookClient] Receiving handbook:', handbook);
  console.log('[HandbookClient] Handbook type:', typeof handbook);

  // Kontrollera att handbook-objektet är giltigt
  if (!handbook) {
    console.error('[HandbookClient] Handbook is null or undefined');
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fel: Ingen handbokdata</h1>
          <p className="text-gray-600">Handbook prop är null eller undefined.</p>
        </div>
      </div>
    );
  }

  if (!handbook.metadata) {
    console.error('[HandbookClient] Handbook metadata is missing:', handbook);
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fel: Metadata saknas</h1>
          <p className="text-gray-600">Handbokens metadata är inte tillgänglig.</p>
        </div>
      </div>
    );
  }

  if (!handbook.sections || !Array.isArray(handbook.sections)) {
    console.error('[HandbookClient] Handbook sections are invalid:', handbook.sections);
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fel: Sektioner saknas</h1>
          <p className="text-gray-600">Handbokens sektioner är inte tillgängliga.</p>
        </div>
      </div>
    );
  }

  // Konvertera från HandbookTemplate-format till det format som ModernHandbookClient förväntar sig
  const modernHandbookData = {
    id: handbook.metadata.id || 'unknown',
    title: handbook.metadata.title || 'Okänd handbok',
    subtitle: handbook.metadata.subtitle,
    sections: handbook.sections.map(section => ({
      id: section.id,
      title: section.title,
      pages: section.pages.map(page => ({
        id: page.id,
        title: page.title,
        content: page.content,
        lastUpdated: page.lastUpdated,
        estimatedReadTime: page.estimatedReadTime
      }))
    }))
  };

  console.log('[HandbookClient] Converted data for ModernHandbookClient:', modernHandbookData);

  return <ModernHandbookClient initialData={modernHandbookData} />;
};

export default HandbookClient; 