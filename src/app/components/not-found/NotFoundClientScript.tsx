"use client";

import { useEffect } from 'react';

export function NotFoundClientScript() {
  useEffect(() => {
    // Detect if we're on a subdomain with potential CORS issues
    const host = window.location.hostname;
    if (host.endsWith('.handbok.org') && host !== 'handbok.org' && host !== 'www.handbok.org') {
      console.log('404 page on subdomain, loading resource fix script');
      
      // Add the static resource fix script
      const script = document.createElement('script');
      script.src = '/static-resource-fix.js';
      script.async = true;
      document.head.appendChild(script);
      
      // Add debugging info to console
      console.log('Debug info:', {
        subdomain: host,
        path: window.location.pathname,
        url: window.location.href,
        type: host.startsWith('test.') ? 'test-subdomain' : 'regular-subdomain',
        timestamp: new Date().toISOString()
      });
      
      // Auto-redirect to debug page if specific debugging parameter is present
      if (window.location.search.includes('debug=1')) {
        console.log('Debug parameter detected, redirecting to debug page');
        setTimeout(() => {
          // window.location.href = '/debug.html';
        }, 1000);
      }
    }
  }, []);

  // This component doesn't render anything
  return null;
} 