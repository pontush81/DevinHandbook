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
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

// Metadata för SEO
export const metadata: Metadata = {
  title: "Handbok - Digital handbok för bostadsrättsföreningar",
  description: "Handbok för din bostadsrättsförening",
};

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
          /* Base fonts */
          @font-face {
            font-family: 'Geist';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url('https://handbok.org/_next/static/media/569ce4b8f30dc480-s.p.woff2') format('woff2');
          }
          @font-face {
            font-family: 'Geist Mono';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url('https://handbok.org/_next/static/media/a34f9d1faa5f3315-s.p.woff2') format('woff2');
          }
          /* Förhindra FOUC (Flash of Unstyled Content) */
          body { 
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
          }
          body.loaded {
            opacity: 1;
          }
        `}} />
        
        {/* Cross-origin resource fix script */}
        <Script 
          src="https://handbok.org/static-resource-fix.js"
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
        
        {/* Direkt script för att aktivera sidan efter laddning */}
        <Script id="show-page" strategy="afterInteractive">
          {`
            document.addEventListener('DOMContentLoaded', function() {
              document.body.classList.add('loaded');
            });
            // Om DOMContentLoaded redan har inträffat
            if (document.readyState === 'interactive' || document.readyState === 'complete') {
              document.body.classList.add('loaded');
            }
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased handbook-body`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
} 