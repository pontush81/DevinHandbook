import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Script from 'next/script';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Handbok.org - Digital handbok för bostadsrättsföreningar",
  description: "Skapa en digital handbok för din bostadsrättsförening",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <head>
        {/* Inline CORS fix - körs innan något annat */}
        <script dangerouslySetInnerHTML={{ __html: `
          // Detectera om detta är en subdomän eller www
          (function() {
            const host = window.location.hostname;
            const isHandbokDomain = host === 'handbok.org' || 
                                    host === 'www.handbok.org' || 
                                    host.endsWith('.handbok.org');
            
            if (!isHandbokDomain) return;
            
            // Om detta inte är huvuddomänen, aktivera proxy
            if (host !== 'handbok.org') {
              const currentOrigin = window.location.origin;
              
              // Override fetch globalt - körs för alla resurser
              const originalFetch = window.fetch;
              window.fetch = function(url, options) {
                if (typeof url === 'string' && url.startsWith('/') && 
                    (url.includes('/_next/') || url.endsWith('.js') || url.endsWith('.css') || 
                    url.endsWith('.woff') || url.endsWith('.woff2'))) {
                  const proxyUrl = currentOrigin + '/api/resources?path=' + encodeURIComponent(url);
                  console.log('[CORS-Fix] Redirecting fetch:', url, '->', proxyUrl);
                  url = proxyUrl;
                }
                return originalFetch(url, options);
              };
              
              // Skapa en MutationObserver för att fånga <script> och <link> som läggs till
              const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                  if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                      if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'SCRIPT' || node.tagName === 'LINK') {
                          const src = node.getAttribute('src') || node.getAttribute('href');
                          if (src && src.startsWith('/') && 
                              (src.includes('/_next/') || src.endsWith('.js') || src.endsWith('.css') || 
                              src.endsWith('.woff') || src.endsWith('.woff2'))) {
                            
                            const newSrc = currentOrigin + '/api/resources?path=' + encodeURIComponent(src);
                            console.log('[CORS-Fix] Fixing resource:', src, '->', newSrc);
                            
                            if (node.tagName === 'SCRIPT') {
                              node.setAttribute('src', newSrc);
                            } else {
                              node.setAttribute('href', newSrc);
                            }
                          }
                        }
                      }
                    });
                  }
                });
              });
              
              // Starta observering av förändringar i DOM
              document.addEventListener('DOMContentLoaded', function() {
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true
                });
                
                // Fixa befintliga resurser
                document.querySelectorAll('script[src], link[rel="stylesheet"], link[rel="preload"]').forEach(function(el) {
                  const src = el.getAttribute('src') || el.getAttribute('href');
                  if (src && src.startsWith('/') && 
                      (src.includes('/_next/') || src.endsWith('.js') || src.endsWith('.css') || 
                      src.endsWith('.woff') || src.endsWith('.woff2'))) {
                    
                    const newSrc = currentOrigin + '/api/resources?path=' + encodeURIComponent(src);
                    console.log('[CORS-Fix] Fixing existing resource:', src, '->', newSrc);
                    
                    if (el.tagName.toLowerCase() === 'script') {
                      el.setAttribute('src', newSrc);
                    } else {
                      el.setAttribute('href', newSrc);
                    }
                  }
                });
              });
              
              // Om DOM redan är laddad
              if (document.readyState === 'interactive' || document.readyState === 'complete') {
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true
                });
                
                // Fixa befintliga resurser
                document.querySelectorAll('script[src], link[rel="stylesheet"], link[rel="preload"]').forEach(function(el) {
                  const src = el.getAttribute('src') || el.getAttribute('href');
                  if (src && src.startsWith('/') && 
                      (src.includes('/_next/') || src.endsWith('.js') || src.endsWith('.css') || 
                      src.endsWith('.woff') || src.endsWith('.woff2'))) {
                    
                    const newSrc = currentOrigin + '/api/resources?path=' + encodeURIComponent(src);
                    console.log('[CORS-Fix] Fixing existing resource:', src, '->', newSrc);
                    
                    if (el.tagName.toLowerCase() === 'script') {
                      el.setAttribute('src', newSrc);
                    } else {
                      el.setAttribute('href', newSrc);
                    }
                  }
                });
              }
              
              console.log('[CORS-Fix] Active - using proxy at', currentOrigin);
            }
          })();
        `}} />
        
        {/* Huvudskript för CORS-fix (körs efter det inlineskriptet) */}
        <Script 
          src="/static-resource-fix.js" 
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
