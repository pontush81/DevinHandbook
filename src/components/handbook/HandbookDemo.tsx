'use client';

import React from 'react';
import { ModernHandbookClient } from '@/components/ModernHandbookClient';

// Simple demo template
const demoHandbook = {
  id: 'demo-handbook',
  title: 'Demo Handbok',
  subtitle: 'Exempel på digital handbok',
  sections: [
    {
      id: 'demo-section-1',
      title: 'Välkommen',
      description: 'Introduktion',
      order_index: 0,
      handbook_id: 'demo-handbook',
      is_public: true,
      pages: [
        {
          id: 'demo-page-1',
          title: 'Översikt',
          content: 'Detta är en demo av handbokssystemet.',
          order_index: 0,
          section_id: 'demo-section-1',
          lastUpdated: new Date().toLocaleDateString('sv-SE'),
          estimatedReadTime: 1
        }
      ]
    }
  ]
};

export const HandbookDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernHandbookClient initialData={demoHandbook} />
    </div>
  );
}; 