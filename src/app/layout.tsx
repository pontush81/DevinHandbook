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
        <title>Handbok.org - Digital handbok för bostadsrättsföreningar | 990 kr/år</title>
        <meta name="description" content="Skapa en digital handbok för din bostadsrättsförening. Samla stadgar, regler, kontakter och information på ett ställe. Tillgängligt dygnet runt för alla medlemmar. Endast 990 kr per år." />
        <meta name="keywords" content="bostadsrättsförening, digital handbok, stadgar, regler, föreningshandbok, brf handbok, bostadsrätt, förening, medlemsinformation" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://handbok.org/" />
        <meta property="og:title" content="Handbok.org - Digital handbok för bostadsrättsföreningar" />
        <meta property="og:description" content="Skapa en digital handbok för din bostadsrättsförening. Samla all viktig information på ett ställe. Endast 990 kr per år." />
        <meta property="og:image" content="https://handbok.org/og-image.jpg" />
        <meta property="og:locale" content="sv_SE" />
        <meta property="og:site_name" content="Handbok.org" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://handbok.org/" />
        <meta property="twitter:title" content="Handbok.org - Digital handbok för bostadsrättsföreningar" />
        <meta property="twitter:description" content="Skapa en digital handbok för din bostadsrättsförening. Samla all viktig information på ett ställe. Endast 990 kr per år." />
        <meta property="twitter:image" content="https://handbok.org/og-image.jpg" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Handbok.org" />
        <meta name="language" content="Swedish" />
        <meta name="geo.region" content="SE" />
        <meta name="geo.country" content="Sweden" />
        <link rel="canonical" href="https://handbok.org/" />
        
        {/* Structured Data for Organization */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Handbok.org",
              "url": "https://handbok.org",
              "logo": "https://handbok.org/logo.png",
              "description": "Digital handbok för bostadsrättsföreningar",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "SE"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "info@handbok.org",
                "contactType": "customer service"
              }
            }
          `}
        </script>
        
        {/* Structured Data for Service */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Service",
              "name": "Digital handbok för bostadsrättsföreningar",
              "description": "Skapa och hantera digital handbok för din bostadsrättsförening med stadgar, regler och viktig information",
              "provider": {
                "@type": "Organization",
                "name": "Handbok.org"
              },
              "areaServed": "Sweden",
              "offers": {
                "@type": "Offer",
                "price": "990",
                "priceCurrency": "SEK",
                "priceValidUntil": "2025-12-31",
                "description": "Årsabonnemang för digital föreningshandbok"
              }
            }
          `}
        </script>
        
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
        
        {/* Preconnect to main domain for faster resource loading */}
        <link rel="preconnect" href="https://www.handbok.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.handbok.org" />
        <link rel="preconnect" href="https://staging.handbok.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://staging.handbok.org" />
        
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
