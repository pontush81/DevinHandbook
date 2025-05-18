'use client';

import React from 'react';

export default function NotFoundActions() {
  const handleApplyCorsfix = () => {
    const script = document.createElement('script');
    script.src = '/static-resource-fix.js';
    document.head.appendChild(script);
  };

  return (
    <button 
      onClick={handleApplyCorsfix}
      className="text-blue-600 hover:underline text-sm inline-flex items-center"
    >
      <span className="mr-1">→</span> Applicera CORS-fix direkt
    </button>
  );
} 