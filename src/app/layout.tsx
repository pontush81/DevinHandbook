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
            transition: background-color 0.2s ease;
          }
          
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
          
          :root {
            --font-geist-sans-fallback: 'Geist Fallback', Arial, sans-serif;
            --font-geist-mono-fallback: 'Geist Mono Fallback', 'Courier New', monospace;
          }
          
          /* Apply fallback immediately while waiting for the real fonts */
          body {
            font-family: var(--font-geist-sans, var(--font-geist-sans-fallback));
          }
          
          code, pre, .font-mono {
            font-family: var(--font-geist-mono, var(--font-geist-mono-fallback));
          }
        `}} />
        
        {/* Loading scripts for fixing cross-domain issues */}
        <Script id="fix-scripts" strategy="beforeInteractive">
          {`
            // Add the script tags dynamically with proper error handling
            (function() {
              try {
                // Check if we need to load resource fixes
                const host = window.location.hostname;
                const isSubdomain = host.endsWith('.handbok.org') && 
                                   host !== 'handbok.org' && 
                                   host !== 'www.handbok.org';
                
                // Function to safely add a script to the page
                function loadScript(src, id) {
                  const script = document.createElement('script');
                  script.src = src;
                  script.id = id;
                  script.async = false; // Load in order
                  script.onerror = function() {
                    console.error('Failed to load script:', src);
                    // Add a retry mechanism
                    setTimeout(() => {
                      console.log('Retrying script load:', src);
                      loadScript(src, id + '-retry');
                    }, 2000);
                  };
                  document.head.appendChild(script);
                }
                
                // Add redirect loop breaker for all domains
                // Check if we're having a loop
                var redirectCount = 0;
                try {
                  redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0');
                } catch(e) {
                  console.warn('Could not access sessionStorage:', e);
                }
                
                // If redirected too many times, stop
                if (redirectCount > 3) {
                  console.error('TOO MANY REDIRECTS - Breaking loop');
                  try {
                    sessionStorage.removeItem('redirect_count');
                  } catch(e) {
                    console.warn('Could not clear sessionStorage:', e);
                  }
                  
                  // If not on the static fallback page already, go there
                  if (window.location.pathname !== '/static-fallback.html') {
                    window.location.href = '/static-fallback.html';
                  }
                } else {
                  // Increment count for next page load
                  try {
                    sessionStorage.setItem('redirect_count', (redirectCount + 1).toString());
                    // Reset count after 5 seconds if no more redirects
                    setTimeout(function() {
                      sessionStorage.setItem('redirect_count', '0');
                    }, 5000);
                  } catch(e) {
                    console.warn('Could not update sessionStorage:', e);
                  }
                }
                
                // Load static resource fix first (for all domains)
                loadScript('/static-resource-fix.js', 'static-resource-fix');
                
                // Only load cross-domain storage for subdomains
                if (isSubdomain) {
                  // Allow the first script to load first
                  setTimeout(function() {
                    loadScript('/cross-domain-storage.js', 'cross-domain-storage');
                  }, 100);
                }
              } catch(e) {
                console.error('Error in fix-scripts:', e);
              }
            })();
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
