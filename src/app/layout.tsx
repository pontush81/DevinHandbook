import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Script from 'next/script';
import { SessionReconnectHandler } from "@/components/SessionReconnectHandler";
import { AuthDebugButton } from "@/components/debug/AuthDebugButton";
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
                const message = args.join(' ');
                
                // Filter out all localStorage-related errors
                if (message.includes('Access to storage is not allowed') ||
                    message.includes('localStorage is not available') ||
                    message.includes('storage is not allowed from this context') ||
                    message.includes('localStorage') && message.includes('blocked') ||
                    message.includes('QuotaExceededError') ||
                    message.includes('storage quota') ||
                    message.includes('DOM Exception') && message.includes('storage')) {
                  return; // Suppress these errors completely
                }
                
                // Show all other errors normally
                originalError.apply(console, args);
              };
              
              // Override console.warn for localStorage warnings
              console.warn = function(...args) {
                const message = args.join(' ');
                
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
                if (reason && reason.message && 
                    (reason.message.includes('Access to storage is not allowed') ||
                     reason.message.includes('localStorage') ||
                     reason.message.includes('storage is not allowed'))) {
                  event.preventDefault(); // Prevent error from showing
                  return;
                }
              });
              
              // Global error handler for regular errors
              window.addEventListener('error', function(event) {
                const message = event.message || '';
                if (message.includes('Access to storage is not allowed') ||
                    message.includes('localStorage') ||
                    message.includes('storage is not allowed')) {
                  event.preventDefault();
                  return;
                }
              });
              
              // Override localStorage methods to never throw
              if (typeof Storage !== 'undefined') {
                const originalSetItem = Storage.prototype.setItem;
                const originalGetItem = Storage.prototype.getItem;
                const originalRemoveItem = Storage.prototype.removeItem;
                
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
        <AuthProvider>
          <SessionReconnectHandler />
          {children}
          <AuthDebugButton />
        </AuthProvider>
      </body>
    </html>
  );
}