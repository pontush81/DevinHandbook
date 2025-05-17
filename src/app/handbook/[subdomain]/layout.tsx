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
        {/* ALLA RESOURCE SCRIPTS BORTTAGNA FÖR ATT LÖSA TOO MANY REDIRECTS */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased handbook-body`}
      >
        <AuthProvider>{children}</AuthProvider>
        
        {/* SCRIPT BORTTAGEN */}
      </body>
    </html>
  );
} 