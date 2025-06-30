'use client';

import { useEffect } from 'react';

interface DynamicManifestProps {
  handbookSlug?: string;
}

export function DynamicManifest({ handbookSlug }: DynamicManifestProps) {
  useEffect(() => {
    // Remove existing manifest link
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.remove();
    }

    // Create new manifest link
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    
    if (handbookSlug) {
      manifestLink.href = `/api/manifest?slug=${handbookSlug}`;
      console.log(`[DynamicManifest] Setting handbook-specific manifest for: ${handbookSlug}`);
    } else {
      manifestLink.href = '/api/manifest';
      console.log('[DynamicManifest] Setting base manifest');
    }

    // Add to head
    document.head.appendChild(manifestLink);

    // Cleanup function
    return () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (link && link === manifestLink) {
        link.remove();
      }
    };
  }, [handbookSlug]);

  return null;
} 