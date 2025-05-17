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
        
        {/* Inline CORS and domain fix script - runs first */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            const host = window.location.hostname;
            
            // Redirect www to non-www immediately to avoid CORS issues
            if (host === 'www.handbok.org') {
              window.location.href = window.location.href.replace('www.handbok.org', 'handbok.org');
              return;
            }
            
            // Check if we're on a handbok.org domain
            const isHandbokDomain = host === 'handbok.org' || host.endsWith('.handbok.org');
            
            if (!isHandbokDomain) return;
            
            // If this is a subdomain, activate the resource proxy
            if (host !== 'handbok.org') {
              // Load the full resource fix script
              const script = document.createElement('script');
              script.src = 'https://handbok.org/static-resource-fix.js';
              script.crossOrigin = 'anonymous';
              script.onerror = function() {
                console.error('[CORS-Fix] Failed to load static resource fix script from main domain. Trying local.');
                const localScript = document.createElement('script');
                localScript.src = '/static-resource-fix.js';
                localScript.crossOrigin = 'anonymous';
                document.head.appendChild(localScript);
              };
              document.head.appendChild(script);
              
              console.log('[CORS-Fix] Loading static resource fix script');
            }
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        
        {/* Main CORS fix script - load at the end to ensure it runs after everything else */}
        <Script 
          src="/static-resource-fix.js" 
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
