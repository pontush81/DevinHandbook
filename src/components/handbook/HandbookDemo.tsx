'use client';

import React from 'react';
import { ModernHandbookClient } from '../ModernHandbookClient';
import { defaultHandbookTemplate } from '@/lib/templates/handbook-template';

export const HandbookDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernHandbookClient handbookData={defaultHandbookTemplate} />
    </div>
  );
}; 