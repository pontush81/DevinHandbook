"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Script from 'next/script';
import SessionResetNotice from "@/components/SessionResetNotice";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

// Säker localStorage-hantering
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try { 
      if (typeof window !== 'undefined' && window.safeStorage) {
        return window.safeStorage.getItem(key);
      }
      return localStorage.getItem(key); 
    }
    catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { 
      if (typeof window !== 'undefined' && window.safeStorage) {
        window.safeStorage.setItem(key, value);
        return;
      }
      localStorage.setItem(key, value); 
    }
    catch { /* fail silently */ }
  },
  removeItem: (key: string): void => {
    try { 
      if (typeof window !== 'undefined' && window.safeStorage) {
        window.safeStorage.removeItem(key);
        return;
      }
      localStorage.removeItem(key); 
    }
    catch { /* fail silently */ }
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" suppressHydrationWarning className={inter.className}>
      <head>
        <title>Handbok.org - Digital handbok för bostadsrättsföreningar</title>
        <meta name="description" content="Skapa en digital handbok för din bostadsrättsförening" />
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
        
        {/* Auth storage fallback script */}
        <Script src="/auth-storage-fallback.js" strategy="beforeInteractive" />
        
        {/* Inline critical CSS för att förhindra FOUC och garantera grundläggande styling */}
        <style dangerouslySetInnerHTML={{ __html: `` }} />
        
        {/* Preconnect to main domain for faster resource loading */}
        <link rel="preconnect" href="https://www.handbok.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.handbok.org" />
        <link rel="preconnect" href="https://staging.handbok.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://staging.handbok.org" />
        
        {/* Load critical utilities before anything else */}
        <Script src="/js-fallback.js" strategy="beforeInteractive" />
        
        {/* Simplified emergency script - moved complex logic to separate files */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              // Basic font fallback
              if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                  if (!document.fonts.check('1em Geist')) {
                    const style = document.createElement('style');
                    style.innerHTML = '.font-sans { font-family: Arial, sans-serif !important; } .font-mono { font-family: "Courier New", monospace !important; }';
                    document.head.appendChild(style);
                  }
                }).catch(() => {
                  // Fallback if font loading fails
                  const style = document.createElement('style');
                  style.innerHTML = '.font-sans { font-family: Arial, sans-serif !important; } .font-mono { font-family: "Courier New", monospace !important; }';
                  document.head.appendChild(style);
                });
              }
            } catch(e) {
              console.warn('Font loading error:', e);
            }
          })();
        `}} />
        
        {/* Memory-baserad fallback för AuthContext om localStorage är blockerad */}
        <Script id="auth-context-fallback" strategy="beforeInteractive">
          {`
            (function() {
              try {
                if (typeof window !== 'undefined') {
                  // In-memory fallback för session-data
                  window.memoryStorage = {};
                  
                  // Local Storage test
                  let canUseLocalStorage = false;
                  try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    canUseLocalStorage = true;
                  } catch (e) {
                    console.warn('localStorage är blockerad eller ej tillgänglig:', e);
                  }
                  
                  if (!canUseLocalStorage) {
                    console.info('Använder memory storage som fallback för localStorage');
                  }
                }
              } catch(e) {
                console.error('Fel vid localStorage-kontroll:', e);
              }
            })();
          `}
        </Script>
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <SessionResetNotice />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
