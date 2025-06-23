import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script';
// Import dev utils to make forceLogout available globally
import "@/lib/dev-utils";

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
        <title>Handbok.org - Digital handbok för bostadsrättsföreningar | 2490 kr/år</title>
        <meta name="description" content="Skapa en digital handbok för din bostadsrättsförening. Samla stadgar, regler, kontakter och information på ett ställe. Tillgängligt dygnet runt för alla medlemmar. Endast 2490 kr per år." />
        <meta name="keywords" content="bostadsrättsförening, digital handbok, stadgar, regler, föreningshandbok, brf handbok, bostadsrätt, förening, medlemsinformation" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://handbok.org/" />
        <meta property="og:title" content="Handbok.org - Digital handbok för bostadsrättsföreningar" />
        <meta property="og:description" content="Skapa en digital handbok för din bostadsrättsförening. Samla all viktig information på ett ställe. Endast 2490 kr per år." />
        <meta property="og:image" content="https://handbok.org/og-image.jpg" />
        <meta property="og:locale" content="sv_SE" />
        <meta property="og:site_name" content="Handbok.org" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://handbok.org/" />
        <meta property="twitter:title" content="Handbok.org - Digital handbok för bostadsrättsföreningar" />
        <meta property="twitter:description" content="Skapa en digital handbok för din bostadsrättsförening. Samla all viktig information på ett ställe. Endast 2490 kr per år." />
        <meta property="twitter:image" content="https://handbok.org/og-image.jpg" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Handbok.org" />
        <meta name="language" content="Swedish" />
        <meta name="geo.region" content="SE" />
        <meta name="geo.country" content="Sweden" />
        <link rel="canonical" href="https://handbok.org/" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Handbok" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Handbok" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* PWA Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16x16.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2563eb" />
        
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
                "price": "2490",
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
              // Comprehensive localStorage error suppression
              const originalError = console.error;
              const originalWarn = console.warn;
              
              // Override console.error to filter localStorage errors
              console.error = function(...args) {
                const message = String(args[0] || '');
                
                // Filter out all localStorage-related errors
                if (message.includes('Access to storage is not allowed') ||
                    message.includes('localStorage is not available') ||
                    message.includes('storage is not allowed from this context') ||
                    message.includes('localStorage') && message.includes('blocked') ||
                    message.includes('QuotaExceededError') ||
                    message.includes('storage quota') ||
                    message.includes('DOM Exception') && message.includes('storage') ||
                    message.includes('SecurityError') && message.includes('storage')) {
                  return; // Suppress these errors completely
                }
                
                // Show all other errors normally
                originalError.apply(console, args);
              };
              
              // Override console.warn for localStorage warnings
              console.warn = function(...args) {
                const message = String(args[0] || '');
                
                if (message.includes('localStorage') ||
                    message.includes('storage') && message.includes('blocked') ||
                    message.includes('Access to storage')) {
                  return; // Suppress storage warnings
                }
                
                originalWarn.apply(console, args);
              };
              
              // Global error handler for unhandled promise rejections
              window.addEventListener('unhandledrejection', function(event) {
                const reason = event.reason;
                const message = String(reason?.message || reason || '');
                if (message.includes('Access to storage is not allowed') ||
                    message.includes('localStorage') ||
                    message.includes('storage is not allowed') ||
                    message.includes('SecurityError')) {
                  event.preventDefault(); // Prevent error from showing
                  return;
                }
              });
              
              // Global error handler for regular errors
              window.addEventListener('error', function(event) {
                const message = String(event.message || '');
                if (message.includes('Access to storage is not allowed') ||
                    message.includes('localStorage') ||
                    message.includes('storage is not allowed') ||
                    message.includes('SecurityError')) {
                  event.preventDefault();
                  return;
                }
              });
              
              // Override localStorage methods to never throw
              if (typeof Storage !== 'undefined') {
                const originalSetItem = Storage.prototype.setItem;
                const originalGetItem = Storage.prototype.getItem;
                const originalRemoveItem = Storage.prototype.removeItem;
                const originalKey = Storage.prototype.key;
                const originalClear = Storage.prototype.clear;
                
                Storage.prototype.setItem = function(key, value) {
                  try {
                    return originalSetItem.call(this, key, value);
                  } catch (e) {
                    // Completely silent fail
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
                    // Completely silent fail
                    return;
                  }
                };
                
                Storage.prototype.key = function(index) {
                  try {
                    return originalKey.call(this, index);
                  } catch (e) {
                    return null;
                  }
                };
                
                Storage.prototype.clear = function() {
                  try {
                    return originalClear.call(this);
                  } catch (e) {
                    // Completely silent fail
                    return;
                  }
                };
                
                // Override length property getter
                Object.defineProperty(Storage.prototype, 'length', {
                  get: function() {
                    try {
                      return Object.getOwnPropertyDescriptor(Storage.prototype, 'length').get.call(this);
                    } catch (e) {
                      return 0;
                    }
                  }
                });
              }
            })();
          `}
        </Script>
        
        {/* Safe localStorage implementation */}
        <Script id="safe-storage" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined') {
              // Test localStorage access once at startup with safe methods
              let localStorageAvailable = false;
              try {
                const testKey = '__ls_test__';
                window.localStorage.setItem(testKey, 'test');
                window.localStorage.removeItem(testKey);
                localStorageAvailable = true;
              } catch(e) {
                // Silent fail - localStorage is blocked
              }
              
              window.safeStorage = {
                getItem: function(key) {
                  if (!localStorageAvailable) return null;
                  try { return window.localStorage.getItem(key); } 
                  catch(e) { return null; }
                },
                setItem: function(key, value) {
                  if (!localStorageAvailable) return;
                  try { window.localStorage.setItem(key, value); } 
                  catch(e) { /* silently fail */ }
                },
                removeItem: function(key) {
                  if (!localStorageAvailable) return;
                  try { window.localStorage.removeItem(key); } 
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
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        {children}
        
        {/* PWA Service Worker Registration */}
        <Script id="pwa-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('PWA: Service Worker registrerad:', registration.scope);
                    
                    // Lyssna på uppdateringar
                    registration.addEventListener('updatefound', () => {
                      const newWorker = registration.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Ny version tillgänglig
                            if (confirm('En ny version av appen är tillgänglig. Vill du uppdatera?')) {
                              newWorker.postMessage({ type: 'SKIP_WAITING' });
                              window.location.reload();
                            }
                          }
                        });
                      }
                    });
                  })
                  .catch(function(error) {
                    console.log('PWA: Service Worker registrering misslyckades:', error);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}