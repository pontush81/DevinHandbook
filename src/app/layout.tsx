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
        {/* Fallback font styles to ensure text displays immediately */}
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
        
        {/* Redirect loop breaker script */}
        <Script id="redirect-loop-breaker" strategy="beforeInteractive">
          {`
            (function() {
              try {
                // Get current URL and parameters
                var url = new URL(window.location.href);
                var path = url.pathname;
                
                // Check if we're having a loop
                var redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0');
                
                // If redirected too many times, stop
                if (redirectCount > 3) {
                  console.error('TOO MANY REDIRECTS - Breaking loop');
                  sessionStorage.removeItem('redirect_count');
                  
                  // Show emergency feedback to the user
                  document.addEventListener('DOMContentLoaded', function() {
                    var div = document.createElement('div');
                    div.style.position = 'fixed';
                    div.style.top = '0';
                    div.style.left = '0';
                    div.style.right = '0';
                    div.style.padding = '16px';
                    div.style.background = 'red';
                    div.style.color = 'white';
                    div.style.textAlign = 'center';
                    div.style.zIndex = '9999';
                    div.innerHTML = '<strong>Redirect loop detected!</strong> Trying emergency static page. <a href="/view" style="color:white;text-decoration:underline;">Click here for handbok viewer</a>';
                    document.body.appendChild(div);
                  });
                  
                  // If we're not on the static fallback page already, go there
                  if (path !== '/view' && path !== '/static-fallback.html') {
                    window.location.href = '/static-fallback.html';
                  }
                } else {
                  // Increment count for next page load
                  sessionStorage.setItem('redirect_count', (redirectCount + 1).toString());
                  
                  // Reset count after 5 seconds if no more redirects
                  setTimeout(function() {
                    sessionStorage.setItem('redirect_count', '0');
                  }, 5000);
                }
              } catch(e) {
                console.error('Error in redirect detection', e);
              }
            })();
          `}
        </Script>

        {/* Script for handling static resources on subdomains */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Check if we're on a subdomain
              (function() {
                const host = window.location.hostname;
                const isSubdomain = host.endsWith('.handbok.org') && host !== 'handbok.org' && host !== 'www.handbok.org';
                
                if (isSubdomain) {
                  console.log('Subdomain detected, loading resource fix script');
                  const script = document.createElement('script');
                  script.src = '/static-resource-fix.js';
                  script.async = true;
                  document.head.appendChild(script);
                  
                  // Also load cross-domain storage script for auth handling
                  const storageScript = document.createElement('script');
                  storageScript.src = '/cross-domain-storage.js';
                  storageScript.async = true;
                  document.head.appendChild(storageScript);
                }
              })();
            `
          }}
        />
        
        {/* Preload cross-domain scripts for faster loading */}
        <link rel="preload" href="/static-resource-fix.js" as="script" />
        <link rel="preload" href="/cross-domain-storage.js" as="script" />
        <link rel="preload" href="/storage-bridge.html" as="document" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
