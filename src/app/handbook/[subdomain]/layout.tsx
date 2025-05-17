import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';

// Importera globala stilar och AuthProvider
import "@/app/globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

// Font-inställningar med optimal laddningsstrategi
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

// Generera dynamisk metadata baserat på subdomän
export async function generateMetadata({ 
  params 
}: { 
  params: { subdomain: string } 
}): Promise<Metadata> {
  const { subdomain } = params;
  
  return {
    title: `${subdomain} - Digital handbok`,
    description: `Digital handbok för ${subdomain}`,
    metadataBase: new URL(`https://${subdomain}.handbok.org`),
  };
}

export default function HandbookLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { subdomain: string };
}>) {
  return (
    <html lang="sv">
      <head>
        {/* Lägg till Critical CSS inline */}
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
          
          /* CSS Custom Properties for font fallbacks */
          :root {
            --font-geist-sans-fallback: 'Geist Fallback', Arial, sans-serif;
            --font-geist-mono-fallback: 'Geist Mono Fallback', 'Courier New', monospace;
          }
          
          /* Apply fallback immediately while waiting for the real fonts */
          body {
            font-family: var(--font-geist-sans, var(--font-geist-sans-fallback));
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
          }
          
          body.loaded {
            opacity: 1;
          }
          
          code, pre, .font-mono {
            font-family: var(--font-geist-mono, var(--font-geist-mono-fallback));
          }
          
          /* Base font preloading with direct URLs */
          @font-face {
            font-family: 'Geist';
            font-style: normal;
            font-weight: 400 500 600;
            font-display: swap;
            src: local('Geist'), url('https://handbok.org/_next/static/media/569ce4b8f30dc480-s.p.woff2') format('woff2');
          }
          
          @font-face {
            font-family: 'Geist Mono';
            font-style: normal;
            font-weight: 400 500;
            font-display: swap;
            src: local('Geist Mono'), url('https://handbok.org/_next/static/media/a34f9d1faa5f3315-s.p.woff2') format('woff2');
          }
        `}} />
        
        {/* Resource loading helper without redirects */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Preload critical fonts directly from the main domain
            const fontUrls = [
              '/_next/static/media/569ce4b8f30dc480-s.p.woff2',
              '/_next/static/media/a34f9d1faa5f3315-s.p.woff2'
            ];
            
            fontUrls.forEach(url => {
              const link = document.createElement('link');
              link.rel = 'preload';
              link.as = 'font';
              link.type = 'font/woff2';
              link.href = 'https://handbok.org' + url;
              link.crossOrigin = 'anonymous';
              document.head.appendChild(link);
            });
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased handbook-body`}
      >
        <AuthProvider>{children}</AuthProvider>
        
        {/* Direct script to activate page after loading */}
        <Script id="show-page" strategy="afterInteractive">
          {`
            function showPage() {
              document.body.classList.add('loaded');
            }
            
            // Check if fonts and critical resources are loaded
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(showPage);
            } else {
              // Fallback if document.fonts is not supported
              setTimeout(showPage, 100);
            }
            
            // Show the page anyway after timeout to prevent indefinite blank screen
            setTimeout(showPage, 1000);
          `}
        </Script>
      </body>
    </html>
  );
} 