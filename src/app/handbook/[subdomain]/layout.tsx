import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';

// Importera globala stilar och AuthProvider
import "@/app/globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

// Font-inställningar med optimal laddningsstrategi
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['Arial', 'sans-serif'],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['Courier New', 'monospace'],
});

// Generera dynamisk metadata baserat på subdomän
export async function generateMetadata({ 
  params 
}: { 
  params: { subdomain: string } 
}): Promise<Metadata> {
  const { subdomain } = params;
  
  return {
    title: `${subdomain} - Digital handbok`,
    description: `Digital handbok för ${subdomain}`,
    metadataBase: new URL(`https://${subdomain}.handbok.org`),
  };
}

export default function HandbookLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { subdomain: string };
}>) {
  return (
    <html lang="sv">
      <head>
        {/* Lägg till Critical CSS inline */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* Fallback fonts that will be used if Google Fonts fail to load */
          @font-face {
            font-family: 'Geist Fallback';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: local('Arial');
          }
          
          @font-face {
            font-family: 'Geist Mono Fallback';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: local('Courier New');
          }
          
          /* CSS Custom Properties for font fallbacks */
          :root {
            --font-geist-sans-fallback: 'Geist Fallback', Arial, sans-serif;
            --font-geist-mono-fallback: 'Geist Mono Fallback', 'Courier New', monospace;
          }
          
          /* Apply fallback immediately while waiting for the real fonts */
          body {
            font-family: var(--font-geist-sans, var(--font-geist-sans-fallback));
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
          }
          
          body.loaded {
            opacity: 1;
          }
          
          code, pre, .font-mono {
            font-family: var(--font-geist-mono, var(--font-geist-mono-fallback));
          }
          
          /* Base font preloading with proxy URLs */
          @font-face {
            font-family: 'Geist';
            font-style: normal;
            font-weight: 400 500 600;
            font-display: swap;
            src: local('Geist'), url('https://handbok.org/_next/static/media/569ce4b8f30dc480-s.p.woff2') format('woff2');
          }
          
          @font-face {
            font-family: 'Geist Mono';
            font-style: normal;
            font-weight: 400 500;
            font-display: swap;
            src: local('Geist Mono'), url('https://handbok.org/_next/static/media/a34f9d1faa5f3315-s.p.woff2') format('woff2');
          }
        `}} />
        
        {/* Inline script for CORS fix - runs first */}
        <script dangerouslySetInnerHTML={{ __html: `
          // Initialize static resource fix immediately
          (function() {
            // Redirect all subdomain traffic to the appropriate page on the main domain
            const host = window.location.hostname;
            const subdomain = host.split('.')[0];
            const path = window.location.pathname;
            const search = window.location.search;
            
            // Only process if this is a subdomain
            if (host !== 'handbok.org' && host.endsWith('.handbok.org')) {
              // Check if we're loading a static resource
              if (path.includes('/_next/') || 
                  path.endsWith('.js') || 
                  path.endsWith('.css') || 
                  path.endsWith('.woff') || 
                  path.endsWith('.woff2')) {
                // For static resources, we'll handle it with a proxy (see static-resource-fix.js)
              } else {
                // For normal page loads, redirect to the correct path on the main domain
                const mainDomainUrl = \`https://handbok.org/handbook/\${subdomain}\${path}\${search}\`;
                window.location.href = mainDomainUrl;
                return;
              }
            }
            
            // Load the static resource fix script directly from the main domain
            const script = document.createElement('script');
            script.src = 'https://handbok.org/static-resource-fix.js';
            script.crossOrigin = 'anonymous';
            script.onerror = function() {
              // Fallback to loading from the current domain if main domain fails
              const fallbackScript = document.createElement('script');
              fallbackScript.src = '/static-resource-fix.js';
              fallbackScript.crossOrigin = 'anonymous';
              document.head.appendChild(fallbackScript);
            };
            document.head.appendChild(script);
            
            // Preload critical fonts directly from the main domain
            const fontUrls = [
              '/_next/static/media/569ce4b8f30dc480-s.p.woff2',
              '/_next/static/media/a34f9d1faa5f3315-s.p.woff2'
            ];
            
            fontUrls.forEach(url => {
              const link = document.createElement('link');
              link.rel = 'preload';
              link.as = 'font';
              link.type = 'font/woff2';
              link.href = 'https://handbok.org' + url;
              link.crossOrigin = 'anonymous';
              document.head.appendChild(link);
            });
            
            // Detect failures and display diagnostics if needed
            window.addEventListener('error', function(e) {
              // Only track resource errors
              if (e.target && (e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT')) {
                console.error('[Resource Error]', e.target.src || e.target.href);
                
                // Add a debug button if multiple errors
                if (document.querySelectorAll('.resource-error-badge').length === 0) {
                  const badge = document.createElement('div');
                  badge.className = 'resource-error-badge';
                  badge.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#f44336;color:white;padding:10px;border-radius:5px;font-size:12px;cursor:pointer;z-index:9999;';
                  badge.textContent = 'Resource Errors Detected';
                  badge.onclick = function() {
                    window.location.href = 'https://handbok.org/debug.html';
                  };
                  
                  // Only add when document body is ready
                  if (document.body) {
                    document.body.appendChild(badge);
                  } else {
                    window.addEventListener('DOMContentLoaded', function() {
                      document.body.appendChild(badge);
                    });
                  }
                }
              }
            }, true);
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased handbook-body`}
      >
        <AuthProvider>{children}</AuthProvider>
        
        {/* Direct script to activate page after loading */}
        <Script id="show-page" strategy="afterInteractive">
          {`
            function showPage() {
              document.body.classList.add('loaded');
            }
            
            // Check if fonts and critical resources are loaded
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(showPage);
            } else {
              // Fallback if document.fonts is not supported
              setTimeout(showPage, 100);
            }
            
            // Show the page anyway after timeout to prevent indefinite blank screen
            setTimeout(showPage, 1000);
          `}
        </Script>
      </body>
    </html>
  );
} 