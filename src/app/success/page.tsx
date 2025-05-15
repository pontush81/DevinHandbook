"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  // const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const handbookName = searchParams.get('handbook_name');
  const subdomain = searchParams.get('subdomain');
  
  useEffect(() => {
    if (!handbookName || !subdomain) {
      setError('Information om handboken saknas');
      setIsLoading(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [handbookName, subdomain]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold mb-6 text-center">Förbereder din handbok...</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
          <p className="mt-6 text-center text-gray-500">
            Vi sätter upp din handbok. Detta kan ta upp till en minut.
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold mb-4 text-center">Något gick fel</h1>
          <p className="text-red-600 mb-6 text-center">{error}</p>
          <div className="flex justify-center">
            <Link href="/" className="px-4 py-2 bg-black text-white rounded-md">
              Gå till startsidan
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-center">Betalningen lyckades!</h1>
        <p className="text-center text-gray-500 mb-6">
          Din handbok för {handbookName} har skapats och är nu tillgänglig.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <p className="text-center">
            Din handbok finns på:
            <a 
              href={`https://${subdomain}.handbok.org`} 
              className="block mt-2 font-medium text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {subdomain}.handbok.org
            </a>
          </p>
        </div>
        
        <div className="flex justify-center">
          <Link href="/" className="px-4 py-2 bg-black text-white rounded-md">
            Gå till startsidan
          </Link>
        </div>
      </div>
    </div>
  );
}
