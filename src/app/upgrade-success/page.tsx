"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  BookOpen,
  Users,
  Smartphone
} from 'lucide-react';

// Loading component för Suspense
function LoadingSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
      <Card className="shadow-xl border-t-4 border-t-green-500 max-w-2xl w-full">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Laddar...
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

// Huvudkomponent som använder useSearchParams
function UpgradeSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);
  const [handbookSlug, setHandbookSlug] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const handbookId = searchParams.get('handbookId');
  const returnTo = searchParams.get('returnTo');

  // Hämta handbok slug om vi har ett handbookId
  useEffect(() => {
    if (handbookId && returnTo === 'handbook') {
      fetch(`/api/handbooks/${handbookId}`)
        .then(res => res.json())
        .then(data => {
          if (data.slug) {
            setHandbookSlug(data.slug);
          }
        })
        .catch(err => {
          console.error('Failed to fetch handbook:', err);
        });
    }
  }, [handbookId, returnTo]);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect till handbok om vi har slug, annars dashboard
          if (handbookSlug && returnTo === 'handbook') {
            router.push(`/${handbookSlug}`);
          } else {
            router.push('/dashboard');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, handbookSlug, returnTo]);

  const goToDestination = () => {
    if (handbookSlug && returnTo === 'handbook') {
      router.push(`/${handbookSlug}`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Huvudkort */}
        <Card className="shadow-xl border-t-4 border-t-green-500">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <Badge variant="outline" className="mx-auto mb-3 bg-green-100 text-green-800 border-green-300">
              <Sparkles className="w-3 h-3 mr-1" />
              Betalning genomförd
            </Badge>
            <CardTitle className="text-3xl font-bold text-gray-900">
              Tack för din betalning! 🎉
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Din handbok är nu betald och aktiverad. Du har full tillgång till alla funktioner.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Funktioner som nu är tillgängliga */}
            <div className="bg-white p-6 rounded-lg border border-green-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-yellow-500" />
                Din handbok inkluderar nu:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Obegränsade handböcker</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Obegränsade sidor</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Anpassade teman</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Medarbetarinbjudningar</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Prioriterad support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">SEO-optimering</span>
                </div>
              </div>
            </div>

            {/* Nästa steg */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">Förslag på nästa steg:</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Slutför din handbok</p>
                    <p className="text-blue-700 text-sm">Lägg till fler sidor och innehåll</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Bjud in ditt team</p>
                    <p className="text-blue-700 text-sm">Låt kollegor hjälpa till att skapa innehåll</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Testa mobilvyn</p>
                    <p className="text-blue-700 text-sm">Se hur snygg handboken ser ut på telefonen</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action knapp */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-lg text-center">
              <Button 
                onClick={goToDestination}
                className="w-full bg-white text-green-600 hover:bg-gray-50 font-semibold py-3 mb-3"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {handbookSlug && returnTo === 'handbook' ? 'Gå till din betalda handbok' : 'Gå till dashboard'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-green-100 text-sm">
                Du kommer att skickas till din handbok om {countdown} sekunder...
              </p>
            </div>

            {/* Supportinfo */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">
                Behöver du hjälp? Vi finns här för dig!
              </p>
              <div className="flex justify-center space-x-4 text-sm">
                <a href="mailto:support@handbok.org" className="text-blue-600 hover:text-blue-800">
                  📧 E-post support
                </a>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">💬 Live chat (kommer snart)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug info (bara i development) */}
        {process.env.NODE_ENV === 'development' && sessionId && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">
                Debug: Session ID = {sessionId}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Huvudkomponent med Suspense wrapper
export default function UpgradeSuccessPage() {
  return (
    <Suspense fallback={<LoadingSuccess />}>
      <UpgradeSuccessContent />
    </Suspense>
  );
} 