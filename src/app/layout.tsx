import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Script from 'next/script';
import Head from 'next/head'

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Handbok.org - Digital handbok för bostadsrättsföreningar",
  description: "Skapa en digital handbok för din bostadsrättsförening",
  metadataBase: new URL('https://www.handbok.org'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" suppressHydrationWarning className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        <meta httpEquiv="Cross-Origin-Embedder-Policy" content="unsafe-none" />
        <meta httpEquiv="Cross-Origin-Opener-Policy" content="unsafe-none" />
        <meta httpEquiv="Cross-Origin-Resource-Policy" content="cross-origin" />
        
        {/* Minimal local storage fallback */}
        <Script id="safe-storage" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined') {
              window.safeStorage = {
                getItem: function(key) {
                  try { return localStorage.getItem(key); } 
                  catch(e) { return null; }
                },
                setItem: function(key, value) {
                  try { localStorage.setItem(key, value); } 
                  catch(e) { /* silently fail */ }
                },
                removeItem: function(key) {
                  try { localStorage.removeItem(key); } 
                  catch(e) { /* silently fail */ }
                }
              };
            }
          `}
        </Script>
        
        {/* Resource fix script for cross-domain resources */}
        <Script src="/static-resource-fix.js" strategy="beforeInteractive" />
        
        {/* Inline critical CSS för att förhindra FOUC och garantera grundläggande styling */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* Critical CSS for base styling - will always load */
          body {
            background-color: #ffffff;
            color: #333333;
            font-family: 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.5;
          }
          
          /* Base typography */
          h1, h2, h3, h4, h5, h6 { margin-top: 1.5rem; margin-bottom: 1rem; color: #111; font-family: 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif; }
          h1 { font-size: 2.25rem; font-weight: 700; }
          h2 { font-size: 1.75rem; font-weight: 600; }
          h3 { font-size: 1.5rem; font-weight: 600; }
          p { margin-bottom: 1rem; }
          a { color: #2563eb; text-decoration: none; }
          a:hover { text-decoration: underline; }
          
          /* Basic components */
          button, .btn { 
            padding: 0.5rem 1rem; 
            background: #2563eb; 
            color: white; 
            border: none; 
            border-radius: 0.25rem;
            cursor: pointer;
            font-size: 1rem;
            font-family: 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif;
          }
          button:hover, .btn:hover {
            background: #1d4ed8;
          }
          input, textarea, select { 
            padding: 0.5rem; 
            border: 1px solid #ddd; 
            border-radius: 0.25rem;
            font-size: 1rem;
            line-height: 1.5;
            font-family: 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif;
          }
          
          /* Layout */
          .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
          
          /* Utility classes */
          .text-center { text-align: center; }
          .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
          .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
          
          /* Font fallbacks */
          @font-face {
            font-family: 'Geist Fallback';
            src: local('Arial');
            font-display: swap;
          }
          
          @font-face {
            font-family: 'Geist Mono Fallback';
            src: local('Courier New');
            font-display: swap;
          }
          
          /* Emergency styles */
          .emergency-notice {
            padding: 12px 16px;
            margin: 10px 0;
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
            border-radius: 4px;
            font-size: 14px;
            font-family: 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif;
          }
        `}} />
        
        {/* Preconnect to main domain for faster resource loading */}
        <link rel="preconnect" href="https://www.handbok.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.handbok.org" />
        <link rel="preconnect" href="https://staging.handbok.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://staging.handbok.org" />
        
        {/* Load critical utilities before anything else */}
        <Script src="/cross-domain-storage.js" strategy="beforeInteractive" />
        <Script src="/static-resource-fix.js" strategy="beforeInteractive" />
        <Script src="/js-fallback.js" strategy="beforeInteractive" />
        
        {/* Emergency script to handle loading issues */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              // Redirect loop detection
              const detectRedirects = () => {
                let redirectCount = 0;
                try { 
                  redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0');
                } catch(e) { 
                  console.warn('Session storage error:', e);
                }
                
                if (redirectCount > 3) {
                  console.error('Redirect loop detected - applying emergency mode');
                  // Reset counter
                  try { sessionStorage.setItem('redirect_count', '0'); } catch(e) {}
                  return true;
                } else {
                  try { 
                    sessionStorage.setItem('redirect_count', (redirectCount + 1).toString());
                    
                    // Auto-reset after 3 seconds if page loads normally
                    setTimeout(() => {
                      try { sessionStorage.setItem('redirect_count', '0'); } catch(e) {}
                    }, 3000);
                  } catch(e) {}
                  return false;
                }
              };
              
              // Only run emergency checks on subdomain
              const currentHost = window.location.hostname;
              
              // Bestäm om vi är i staging eller produktion
              const isStaging = currentHost.includes('staging.handbok.org') || 
                               currentHost.endsWith('.staging.handbok.org');
                                
              const isSubdomain = currentHost.endsWith('.handbok.org') && 
                                 currentHost !== 'handbok.org' &&
                                 currentHost !== 'www.handbok.org' &&
                                 currentHost !== 'staging.handbok.org';
              
              if (isSubdomain) {
                const isRedirectLoop = detectRedirects();
                
                if (isRedirectLoop) {
                  // Apply emergency styles
                  const style = document.createElement('style');
                  style.innerHTML = 'body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }';
                  document.head.appendChild(style);
                  
                  // Show emergency notice when DOM is loaded
                  window.addEventListener('DOMContentLoaded', () => {
                    const div = document.createElement('div');
                    div.className = 'emergency-notice';
                    div.innerHTML = '<strong>Nödfallsläge:</strong> Sidan visas med begränsad formatering på grund av laddningsproblem.';
                    if (document.body) document.body.prepend(div);
                  });
                }
                
                // Fix for static resource loading
                const fixStaticResources = () => {
                  // Direct DOM fixing for resources
                  document.querySelectorAll('link[href^="/_next/"], script[src^="/_next/"], img[src^="/_next/"]').forEach(el => {
                    const attrName = el.hasAttribute('href') ? 'href' : 'src';
                    const url = el.getAttribute(attrName);
                    if (url && url.startsWith('/_next/')) {
                      el.setAttribute(attrName, 'https://www.handbok.org' + url);
                    }
                  });
                };
                
                // Run resource fix both immediately and when DOM is loaded
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', fixStaticResources);
                } else {
                  fixStaticResources();
                }
                
                // Fix JS-filer som returnerar HTML istället för JavaScript
                const fixJsResources = () => {
                  // Specifika problematiska filer som rapporterats
                  const problematicFiles = [
                    'main-app-6cb4d4205dbe6682.js',
                    'not-found-c44b5e0471063abc.js',
                    '1684-dd509a3db56295d1.js',
                    'layout-0c33b245aae4c126.js',
                    '851-c6952f3282869f27.js', 
                    '6874-19a86d48fe6904b6.js',
                    'page-deedaeca2a6f4416.js',
                    '4bd1b696-6406cd3a0eb1deaf.js',
                    'webpack-59fcb2c1b9dd853e.js',
                    '792-f5f0dba6c4a6958b.js'
                  ];
                  
                  // Hitta och fixa script-taggar för problematiska filer
                  document.querySelectorAll('script[src]').forEach(script => {
                    const src = script.getAttribute('src');
                    if (!src) return;
                    
                    const isProblematic = problematicFiles.some(file => src.includes(file));
                    const needsRewrite = src.includes('-') && !src.includes('https://www.handbok.org');
                    
                    if (isProblematic || needsRewrite) {
                      // Rewrite the URL to use the main domain
                      const newSrc = src.startsWith('/') 
                        ? 'https://www.handbok.org' + src 
                        : src.includes('://') ? src : 'https://www.handbok.org/' + src;
                      
                      // Sätt upp ett attribut för att visa att detta har fixats
                      script.setAttribute('data-fixed', 'true');
                      script.setAttribute('src', newSrc);
                    }
                  });
                };
                
                // Kör JS-fix direkt och när DOM är laddad
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', fixJsResources);
                } else {
                  fixJsResources();
                }
              }
              
              // Font loading fallback
              if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                  if (!document.fonts.check('1em Geist')) {
                    console.warn('Font loading failed - applying fallbacks');
                    const style = document.createElement('style');
                    style.innerHTML = '.font-sans, .font-geist-sans, [class*="--font-geist-sans"] { font-family: Arial, sans-serif !important; } .font-mono, .font-geist-mono, [class*="--font-geist-mono"] { font-family: "Courier New", monospace !important; }';
                    document.head.appendChild(style);
                  }
                }).catch(e => console.error('Font loading error:', e));
              }
            } catch(e) {
              console.error('Error in emergency script:', e);
            }
          })();
        `}} />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
