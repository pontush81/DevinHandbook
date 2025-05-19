import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // JavaScript-kod som löser CORS-problem på klientsidan
  const corsFixScript = `
// CORS Fix Script
(function() {
  console.log('Applying CORS fix to document...');
  
  // Override fetch för att hantera CORS
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    // Endast för _next-resurser
    if (typeof url === 'string' && url.includes('/_next/')) {
      console.log('Intercepting fetch for:', url);
      
      // Skapa proxy-URL
      // const proxyUrl = '/api/resources?path=' + encodeURIComponent(new URL(url, window.location.href).pathname);
      console.log('Redirecting through proxy:', url);
      
      return originalFetch(url, options);
    }
    
    // Annars, använd original fetch
    return originalFetch(url, options);
  };
  
  // Fixa existerande script- och link-taggar
  function fixExistingTags() {
    // Hitta alla CSS link-taggar
    const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes('/_next/')) {
        const proxyUrl = '/api/resources?path=' + encodeURIComponent(href);
        console.log('Fixing CSS link:', href, '->', proxyUrl);
        link.setAttribute('href', proxyUrl);
      }
    });
    
    // Hitta alla script-taggar
    const scriptTags = document.querySelectorAll('script[src]');
    scriptTags.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('/_next/')) {
        const proxyUrl = '/api/resources?path=' + encodeURIComponent(src);
        console.log('Fixing script src:', src, '->', proxyUrl);
        script.setAttribute('src', proxyUrl);
      }
    });
  }
  
  // Kör första fix
  fixExistingTags();
  
  // Sätt upp MutationObserver för nya element
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        fixExistingTags();
      }
    });
  });
  
  // Starta observation av DOM-ändringar
  observer.observe(document.documentElement, { 
    childList: true,
    subtree: true
  });
  
  console.log('CORS fix successfully applied');
})();
  `;

  return new NextResponse(corsFixScript, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  });
} 