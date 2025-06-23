'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

export default function NotFoundActions() {
  const handleApplyCorsfix = () => {
    if (typeof document !== 'undefined') {
      const script = document.createElement('script');
      script.src = '/static-resource-fix.js';
      document.head.appendChild(script);
    }
  };

  return (
    <Button 
      onClick={handleApplyCorsfix}
      variant="link"
      className="text-blue-600 hover:underline text-sm inline-flex items-center"
    >
      <span className="mr-1">→</span> Applicera CORS-fix direkt
    </Button>
  );
} 