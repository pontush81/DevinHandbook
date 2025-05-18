import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Script from 'next/script';

// Configure fonts with better cross-domain support
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

export const metadata: Metadata = {
  title: "Handbok.org - Digital handbok för bostadsrättsföreningar",
  description: "Skapa en digital handbok för din bostadsrättsförening",
  metadataBase: new URL('https://handbok.org'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <head>
        {/* Inline critical CSS för att förhindra FOUC */}
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            background-color: #ffffff;
            color: #333333;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
          }
          
          /* Nödfalls-style för att säkerställa visuell grundstruktur */
          h1, h2, h3, h4, h5, h6 { margin-top: 1.5rem; margin-bottom: 1rem; color: #111; }
          p { margin-bottom: 1rem; }
          a { color: #2563eb; text-decoration: none; }
          a:hover { text-decoration: underline; }
          button, .btn { padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.25rem; }
          input, textarea, select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.25rem; }
          .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
          
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
          
          /* Emergency classes */
          .emergency-notice {
            padding: 10px 15px;
            margin: 10px 0;
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
            border-radius: 4px;
            font-size: 14px;
          }
        `}} />
        
        {/* Preconnect to main domain to improve resource loading */}
        <link rel="preconnect" href="https://handbok.org" crossOrigin="anonymous" />
        
        {/* Load critical resources with fallbacks */}
        <Script src="/cross-domain-storage.js" strategy="beforeInteractive" />
        <Script src="/static-resource-fix.js" strategy="beforeInteractive" />
        
        {/* Nödfalls-skript för förhindra redirects och lösa resursproblem */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              // Hantera redirect detection
              var redirectCount = 0;
              try { redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0'); } 
              catch(e) { console.warn('Session storage access error:', e); }
              
              if (redirectCount > 3) {
                console.error('Too many redirects detected, applying emergency mode');
                try { sessionStorage.setItem('redirect_count', '0'); } catch(e) {}
                
                // Tillämpa enkel nödfalls-CSS om sidan har problem med resursladdning
                var style = document.createElement('style');
                style.innerHTML = 'body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }';
                document.head.appendChild(style);
                
                // Visa en notifiering till användaren
                document.addEventListener('DOMContentLoaded', function() {
                  var div = document.createElement('div');
                  div.className = 'emergency-notice';
                  div.innerHTML = '<strong>Nödfallsläge:</strong> Sidan visas med begränsad formatering på grund av laddningsproblem.';
                  if (document.body) document.body.prepend(div);
                });
              } else {
                try { 
                  sessionStorage.setItem('redirect_count', (redirectCount + 1).toString());
                  setTimeout(function() { sessionStorage.setItem('redirect_count', '0'); }, 3000);
                } catch(e) {}
              }
              
              // Fix för font-laddning
              document.fonts.ready.then(function() {
                if (document.fonts.check('1em Geist') === false) {
                  console.warn('Font loading failed, applying fallbacks');
                  var style = document.createElement('style');
                  style.innerHTML = '.font-sans, .font-geist-sans, [class*="--font-geist-sans"] { font-family: Arial, sans-serif !important; } .font-mono, .font-geist-mono, [class*="--font-geist-mono"] { font-family: "Courier New", monospace !important; }';
                  document.head.appendChild(style);
                }
              });
                
              // Vidarebefordra statiska resurser direkt till huvuddomänen för att förhindra redirects
              var currentHost = window.location.hostname;
              var isSubdomain = currentHost.endsWith('.handbok.org') && 
                               currentHost !== 'handbok.org' && 
                               currentHost !== 'www.handbok.org';
              
              if (isSubdomain) {
                // 1. Direkt DOM-fixning för befintliga element
                function fixStaticResources() {
                  var resources = document.querySelectorAll('link[href^="/_next/"], script[src^="/_next/"], img[src^="/_next/"]');
                  resources.forEach(function(el) {
                    var attrName = el.hasAttribute('href') ? 'href' : 'src';
                    var url = el.getAttribute(attrName);
                    if (url && url.startsWith('/_next/')) {
                      el.setAttribute(attrName, 'https://handbok.org' + url);
                    }
                  });
                }
                
                // Kör omedelbart och vid DOMContentLoaded
                fixStaticResources();
                document.addEventListener('DOMContentLoaded', fixStaticResources);
                
                // 2. Övervaka resursladdningsproblem
                window.addEventListener('error', function(e) {
                  var target = e.target;
                  if (target && (target.tagName === 'LINK' || target.tagName === 'SCRIPT' || target.tagName === 'IMG')) {
                    var url = target.src || target.href;
                    if (url && url.includes('/_next/')) {
                      console.warn('Resource loading failed, attempting fix:', url);
                      var newUrl = 'https://handbok.org' + new URL(url).pathname;
                      target.src ? target.src = newUrl : target.href = newUrl;
                    }
                  }
                }, true);
              }
              
              // Fix för storage-problem
              window.safeStorage = {
                getItem: function(key) {
                  try { return localStorage.getItem(key); } 
                  catch(e) { return null; }
                },
                setItem: function(key, value) {
                  try { localStorage.setItem(key, value); return true; } 
                  catch(e) { return false; }
                },
                removeItem: function(key) {
                  try { localStorage.removeItem(key); return true; } 
                  catch(e) { return false; }
                }
              };
            } catch(e) {
              console.error('Error in emergency script:', e);
            }
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        
        {/* Load auth bridge for cross-domain storage access */}
        <iframe 
          src="https://handbok.org/auth-bridge.html" 
          style={{ display: 'none' }} 
          title="Auth Bridge" 
        />
      </body>
    </html>
  );
}
