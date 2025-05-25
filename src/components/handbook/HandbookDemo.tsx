'use client';

import React from 'react';
import { ModernHandbookClient } from '@/components/ModernHandbookClient';
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';

export const HandbookDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernHandbookClient initialData={completeBRFHandbook} />
    </div>
  );
}; 