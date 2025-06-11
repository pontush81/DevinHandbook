"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function ConfirmEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Bekräftar din e-postadress...');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token = searchParams.get('token');
        const userId = searchParams.get('userId');
        const email = searchParams.get('email');
        const timestamp = searchParams.get('timestamp');
        const joinCode = searchParams.get('joinCode');

        if (!token || !userId || !email || !timestamp) {
          setStatus('error');
          setMessage('Ogiltig bekräftelselänk. Kontrollera att länken är korrekt.');
          return;
        }

        // Verifiera token på server-side
        const verifyResponse = await fetch('/api/auth/verify-email-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, userId, email, timestamp }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          setStatus('error');
          setMessage(errorData.error || 'Ogiltig eller utgången bekräftelselänk.');
          return;
        }

        // Token är giltig, bekräfta användaren via säker server-side endpoint
        setMessage('Token verifierad! Bekräftar ditt konto...');

        // Bekräfta användaren via säker server-endpoint (inte client-side admin calls!)
        const confirmResponse = await fetch('/api/auth/confirm-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
            userId, 
            email, 
            timestamp,
            joinCode 
          }),
        });

        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json();
          setStatus('error');
          setMessage(errorData.error || 'Kunde inte bekräfta ditt konto. Försök igen eller kontakta support.');
          return;
        }

        setStatus('success');
        
        if (joinCode) {
          setMessage('E-postadress bekräftad! Du omdirigeras nu för att gå med i handboken...');
          // Omdirigera till login med join-kod för automatisk medlemskap
          setTimeout(() => {
            router.push(`/login?verified=true&from=email_confirmation&join=${joinCode}`);
          }, 2000);
        } else {
          setMessage('E-postadress bekräftad! Du omdirigeras nu till inloggning...');
          setTimeout(() => {
            router.push('/login?verified=true&from=email_confirmation');
          }, 2000);
        }

      } catch (error) {
        console.error('Error confirming email:', error);
        setStatus('error');
        setMessage('Ett fel uppstod vid bekräftelse. Försök igen eller kontakta support.');
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg border border-gray-100">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Bekräftar e-postadress
              </h1>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-900 mb-2">
                E-post bekräftad!
              </h1>
              <p className="text-green-700">{message}</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-red-900 mb-2">
                Bekräftelse misslyckades
              </h1>
              <p className="text-red-700 mb-4">{message}</p>
              <div className="space-y-2">
                <button 
                  onClick={() => router.push('/resend-confirmation')}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
                >
                  Skicka nytt bekräftelsemail
                </button>
                <button 
                  onClick={() => router.push('/login')}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
                >
                  Gå till inloggning
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg border border-gray-100">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Laddar...
          </h1>
          <p className="text-gray-600">Förbereder e-postbekräftelse...</p>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <MainLayout variant="landing" showAuth={false} noWhiteTop={true} showHeader={true}>
      <Suspense fallback={<LoadingFallback />}>
        <ConfirmEmailContent />
      </Suspense>
    </MainLayout>
  );
} 