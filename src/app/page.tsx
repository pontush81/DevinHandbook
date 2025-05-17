'use client';

import Image from "next/image";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isTestDomain, setIsTestDomain] = useState(false);
  const [host, setHost] = useState('');
  
  useEffect(() => {
    // Kolla om vi är på testdomänen
    const hostname = window.location.hostname;
    setHost(hostname);
    setIsTestDomain(hostname === 'test.handbok.org');
  }, []);
  
  if (isTestDomain) {
    return (
      <div className="flex flex-col min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
        <header className="py-4 border-b mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Handbok.org - Testmiljö</h1>
          <p className="text-gray-600">Du är på {host} - testversionen av Handbok.org</p>
        </header>
        
        <main className="flex-grow">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-700 mb-6">
            <strong>Testmiljö!</strong> Du är nu i testmiljön för Handbok.org. 
            <p className="mt-2">Här kan du testa nya funktioner och Stripe-betalningar i testläge utan att påverka produktionsdata.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Diagnostikverktyg</h2>
              <p className="text-gray-600 mb-4">Kontrollera resursladdning och konfigurationer</p>
              <Link 
                href="/test-resources" 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              >
                Öppna testverktyg
              </Link>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">API-tester</h2>
              <p className="text-gray-600 mb-4">Testa API-endpoints och diagnostik</p>
              <div className="space-y-2">
                <a 
                  href="/api/debug" 
                  className="block text-blue-600 hover:text-blue-800"
                  target="_blank"
                >
                  /api/debug - Allmän debug
                </a>
                <a 
                  href="/api/debug?mode=resource-test" 
                  className="block text-blue-600 hover:text-blue-800"
                  target="_blank"
                >
                  /api/debug?mode=resource-test - Resurstester
                </a>
                <a 
                  href="/api/diagnosis" 
                  className="block text-blue-600 hover:text-blue-800"
                  target="_blank"
                >
                  /api/diagnosis - Systemdiagnostik
                </a>
              </div>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Stripe Test</h2>
              <p className="text-gray-600 mb-4">Testa Stripe-integrationen med testkort</p>
              <Link 
                href="/create-handbook?test=1" 
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
              >
                Testa betalning
              </Link>
              <div className="mt-3 text-sm text-gray-500">
                Använd kortnummer: 4242 4242 4242 4242
              </div>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Miljöinformation</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Miljö:</strong> Test</div>
                <div><strong>Stripe-läge:</strong> Testläge</div>
                <div><strong>Branch:</strong> staging</div>
                <div><strong>Domän:</strong> {host}</div>
              </div>
            </div>
          </div>
        </main>
        
        <footer className="mt-12 pt-4 border-t text-center text-gray-500 text-sm">
          <p>Handbok.org Testmiljö - Används endast för testning</p>
          <p className="mt-1">
            <Link href="https://handbok.org" className="text-blue-600 hover:underline">
              Besök produktionsmiljön
            </Link>
          </p>
        </footer>
      </div>
    );
  }
  
  // Standardversionen för produktionsmiljön
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2 tracking-[-.01em]">
            Get started by editing{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
              src/app/page.tsx
            </code>
            .
          </li>
          <li className="tracking-[-.01em]">
            Save and see your changes instantly.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/create-handbook"
          >
            Skapa handbok
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-700 mb-6">
          <strong>Ny funktion!</strong> Du kan nu använda vår förenklade handboksvisare. 
          Istället för att använda subdomäner (företag.handbok.org) kan du besöka:
          <div className="mt-2 font-mono p-2 bg-white rounded border border-blue-100">
            handbok.org/view?company=dittföretagsnamn
          </div>
          <div className="mt-2">
            Detta är en stabilare version som inte drabbas av omdirigeringsproblem.
          </div>
        </div>

        <div className="mt-6">
          <Link 
            href="/view" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            Öppna Handbok-visaren
          </Link>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
