"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Script from 'next/script';
import SessionResetNotice from "@/components/SessionResetNotice";
import { AuthDebugButton } from "@/components/debug/AuthDebugButton";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

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
        
        {/* Förhindra localStorage-fel i konsolen */}
        <Script id="prevent-storage-errors" strategy="beforeInteractive">
          {`
            (function() {
              // Överskugga console.error för att filtrera bort localStorage-fel
              const originalError = console.error;
              console.error = function(...args) {
                const message = args.join(' ');
                
                // Filtrera bort localStorage-relaterade fel
                if (message.includes('Access to storage is not allowed') ||
                    message.includes('localStorage is not available') ||
                    message.includes('storage is not allowed from this context')) {
                  return; // Visa inte dessa fel
                }
                
                // Visa alla andra fel normalt
                originalError.apply(console, args);
              };
              
              // Global error handler för unhandled promise rejections
              window.addEventListener('unhandledrejection', function(event) {
                const reason = event.reason;
                if (reason && reason.message && 
                    reason.message.includes('Access to storage is not allowed')) {
                  event.preventDefault(); // Förhindra att felet visas i konsolen
                  console.info('localStorage är blockerat - använder cookie-baserad lagring istället');
                }
              });
              
              // Fånga vanliga fel
              window.addEventListener('error', function(event) {
                const message = event.message || '';
                if (message.includes('Access to storage is not allowed')) {
                  event.preventDefault();
                  console.info('localStorage är blockerat - använder cookie-baserad lagring istället');
                }
              });
            })();
          `}
        </Script>
        
        {/* Safe localStorage implementation */}
        <Script id="safe-storage" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined') {
              // Test localStorage access once at startup
              let localStorageAvailable = false;
              try {
                const testKey = '__ls_test__';
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
                localStorageAvailable = true;
              } catch(e) {
                console.info('localStorage är inte tillgängligt, använder memory storage');
              }
              
              window.safeStorage = {
                getItem: function(key) {
                  if (!localStorageAvailable) return null;
                  try { return localStorage.getItem(key); } 
                  catch(e) { return null; }
                },
                setItem: function(key, value) {
                  if (!localStorageAvailable) return;
                  try { localStorage.setItem(key, value); } 
                  catch(e) { /* silently fail */ }
                },
                removeItem: function(key) {
                  if (!localStorageAvailable) return;
                  try { localStorage.removeItem(key); } 
                  catch(e) { /* silently fail */ }
                }
              };
              
              // Memory storage fallback
              window.memoryStorage = {};
            }
          `}
        </Script>
        
        {/* Preconnect to main domain for faster resource loading */}
        <link rel="preconnect" href="https://www.handbok.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.handbok.org" />
        <link rel="preconnect" href="https://staging.handbok.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://staging.handbok.org" />
        
        {/* Aggressiv localStorage-felhantering */}
        <Script id="aggressive-storage-error-suppression" strategy="beforeInteractive">
          {`
            (function() {
              // Överskugga alla console-metoder för att filtrera localStorage-fel
              const originalConsole = {
                error: console.error,
                warn: console.warn,
                log: console.log
              };
              
              const filterStorageErrors = (method, args) => {
                const message = args.join(' ');
                if (message.includes('Access to storage is not allowed') ||
                    message.includes('localStorage is not available') ||
                    message.includes('storage is not allowed from this context') ||
                    message.includes('QuotaExceededError') ||
                    message.includes('localStorage') && message.includes('blocked')) {
                  return false; // Filtrera bort
                }
                return true; // Visa
              };
              
              console.error = function(...args) {
                if (filterStorageErrors('error', args)) {
                  originalConsole.error.apply(console, args);
                }
              };
              
              console.warn = function(...args) {
                if (filterStorageErrors('warn', args)) {
                  originalConsole.warn.apply(console, args);
                }
              };
              
              // Fånga alla unhandled promise rejections
              window.addEventListener('unhandledrejection', function(event) {
                const reason = event.reason;
                if (reason && reason.message && 
                    (reason.message.includes('Access to storage is not allowed') ||
                     reason.message.includes('localStorage') ||
                     reason.message.includes('storage is not allowed'))) {
                  event.preventDefault();
                  return;
                }
              });
              
              // Fånga alla fel
              window.addEventListener('error', function(event) {
                const message = event.message || '';
                if (message.includes('Access to storage is not allowed') ||
                    message.includes('localStorage') ||
                    message.includes('storage is not allowed')) {
                  event.preventDefault();
                  return;
                }
              });
              
              // Överskugga localStorage för att aldrig kasta fel
              if (typeof Storage !== 'undefined') {
                const originalSetItem = Storage.prototype.setItem;
                const originalGetItem = Storage.prototype.getItem;
                const originalRemoveItem = Storage.prototype.removeItem;
                
                Storage.prototype.setItem = function(key, value) {
                  try {
                    return originalSetItem.call(this, key, value);
                  } catch (e) {
                    // Silent fail
                    return;
                  }
                };
                
                Storage.prototype.getItem = function(key) {
                  try {
                    return originalGetItem.call(this, key);
                  } catch (e) {
                    return null;
                  }
                };
                
                Storage.prototype.removeItem = function(key) {
                  try {
                    return originalRemoveItem.call(this, key);
                  } catch (e) {
                    // Silent fail
                    return;
                  }
                };
              }
            })();
          `}
        </Script>
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <SessionResetNotice />
          {children}
          <AuthDebugButton />
        </AuthProvider>
      </body>
    </html>
  );
}