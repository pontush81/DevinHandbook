/**
 * font-fix.js - Standalone font CORS fix
 * Denna fil fokuserar endast på att lösa CORS-problem med fonts för subdomäner
 */
(function() {
  if (typeof window === 'undefined') return;
  
  // Kända font-filer som behöver fixas
  const FONTS = [
    {
      name: 'Geist',
      path: '/_next/static/media/569ce4b8f30dc480-s.p.woff2'
    },
    {
      name: 'Geist Mono',
      path: '/_next/static/media/93f479601ee12b01-s.p.woff2'
    }
  ];
  
  // Direkt injektion av @font-face regler som använder vår proxy
  function injectFontFaces() {
    const style = document.createElement('style');
    
    let cssContent = '';
    FONTS.forEach(font => {
      cssContent += `
        @font-face {
          font-family: "${font.name}";
          src: url("/api/proxy-static?path=${encodeURIComponent(font.path)}") format("woff2");
          font-display: swap;
        }
      `;
    });
    
    style.textContent = cssContent;
    document.head.appendChild(style);
    console.log('Font fix: Injected fixed @font-face rules');
  }
  
  // Körs så fort skriptet laddas
  injectFontFaces();
})(); 