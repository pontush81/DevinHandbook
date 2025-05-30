"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(2);
  const [isTestMode, setIsTestMode] = useState(false);
  const [handbookName, setHandbookName] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Check if we're in test mode
    const checkTestMode = async () => {
      try {
        const response = await fetch('/api/stripe/check-mode');
        const data = await response.json();
        setIsTestMode(data.isTestMode);
      } catch (e) {
        console.error('Failed to check test mode:', e);
        setIsTestMode(false);
      }
    };
    checkTestMode();
  }, []);

  // Hämta metadata från backend om session_id finns
  useEffect(() => {
    if (!sessionId) {
      setError('Ingen session_id hittades i URL:en.');
      setIsLoading(false);
      return;
    }
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          return;
        }
        setHandbookName(data.metadata.handbookName || null);
        setSubdomain(data.metadata.subdomain || null);
        
        // Try to create handbook if it doesn't exist in all environments
        // since webhooks can be unreliable in both development and production
        if (data.metadata.handbookName && data.metadata.subdomain && data.metadata.userId) {
          console.log('[Success] Attempting fallback handbook creation (all environments)');
          try {
            const fallbackResponse = await fetch('/api/create-handbook-fallback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                handbookName: data.metadata.handbookName,
                subdomain: data.metadata.subdomain,
                userId: data.metadata.userId
              })
            });
            const fallbackData = await fallbackResponse.json();
            console.log('[Success] Fallback creation result:', fallbackData);
          } catch (e) {
            console.log('Fallback handbook creation failed (this is normal if handbook already exists):', e);
          }
        }
        
        setIsLoading(false);
      } catch (e: any) {
        setError('Kunde inte hämta sessionens metadata.');
        setIsLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // Compute the final path - no test prefix needed for path-based routing
  const getFinalPath = () => {
    if (!subdomain) return '';
    return subdomain;
  };

  // Get the handbook URL using path-based format
  const getHandbookUrl = () => {
    const finalPath = getFinalPath();
    if (!finalPath) {
      console.error('[Success] Cannot create handbook URL: subdomain is missing');
      return '/dashboard'; // Safe fallback
    }
    return `https://www.handbok.org/${finalPath}`;
  };

  useEffect(() => {
    if (!isLoading && !error && handbookName && subdomain) {
      // Starta nedräkning för omdirigering
      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            window.location.href = getHandbookUrl();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [isLoading, error, handbookName, subdomain, isTestMode]);

  if (isLoading) {
    return (
      <MainLayout variant="landing" showAuth={false}>
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
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout variant="landing" showAuth={false}>
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
      </MainLayout>
    );
  }

  const finalPath = getFinalPath();
  const handbookUrl = getHandbookUrl();

  return (
    <MainLayout variant="landing" showAuth={false}>
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
          {isTestMode && (
            <div className="bg-yellow-50 p-3 rounded-md mb-4 text-yellow-800 text-sm">
              <p className="font-medium">Testläge aktivt</p>
              <p>Detta är en testhandbok skapad i testmiljö.</p>
            </div>
          )}
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <p className="text-center">
              Din handbok finns på:
              <a 
                href={handbookUrl} 
                className="block mt-2 font-medium text-blue-600 hover:underline"
              >
                www.handbok.org/{finalPath}
              </a>
            </p>
            <p className="text-center mt-3 text-gray-600">
              Du kommer att omdirigeras automatiskt om {redirectCountdown} sekunder
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            <a 
              href={handbookUrl} 
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              Gå till din handbok nu
            </a>
            <Link href="/" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              Tillbaka till startsidan
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
