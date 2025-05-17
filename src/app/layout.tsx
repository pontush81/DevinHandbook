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
        
        {/* Simple redirect checker - only redirects if needed */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Check if we need to redirect www to non-www
            const host = window.location.hostname;
            
            // Only redirect www to non-www directly
            if (host === 'www.handbok.org') {
              // Get the URL's path and search
              const path = window.location.pathname;
              const search = window.location.search;
              
              // Check for redirect loop by counting redirects via sessionStorage
              try {
                let redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0');
                if (redirectCount > 2) {
                  console.error('Too many redirects detected');
                  return;
                }
                sessionStorage.setItem('redirect_count', String(redirectCount + 1));
              } catch (e) {
                // Handle case where sessionStorage is not available
              }
              
              // Build the redirect URL
              window.location.replace('https://handbok.org' + path + search);
            }
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        
        {/* Main resource fix script - load at the end of the body */}
        <Script 
          src="/static-resource-fix.js" 
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
