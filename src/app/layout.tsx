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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
