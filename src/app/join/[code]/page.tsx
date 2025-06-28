'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, AlertCircle, Key, Book } from 'lucide-react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/supabase';

interface HandbookInfo {
  id: string;
  title: string;
  slug: string;
  expiresAt: string | null;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { user, signUp } = useAuth();
  const joinCode = params.code as string;

  const [handbookInfo, setHandbookInfo] = useState<HandbookInfo | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Registration form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Validate join code on page load
  useEffect(() => {
    const validateJoinCode = async () => {
      if (!joinCode) {
        setError('Ingen join-kod angiven');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/handbook/join?code=${encodeURIComponent(joinCode)}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setHandbookInfo(data.handbook);
        } else {
          setError(data.message || 'Ogiltig join-kod');
        }
      } catch (error) {
        console.error('Error validating join code:', error);
        setError('Kunde inte validera join-kod');
      } finally {
        setIsValidating(false);
      }
    };

    validateJoinCode();
  }, [joinCode]);

  // If user is already logged in, try to join directly
  useEffect(() => {
    const joinHandbook = async () => {
      if (user && handbookInfo && !isJoining) {
        setIsJoining(true);
        try {
          // Use fetchWithAuth to automatically include Bearer token when cookies fail
          const response = await fetchWithAuth('/api/handbook/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ joinCode }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            setSuccess(`Du har gått med i ${handbookInfo.title}!`);
            // Redirect to handbook after 2 seconds
            setTimeout(() => {
              router.push(`/${handbookInfo.slug}`);
            }, 2000);
          } else {
            setError(data.message || 'Kunde inte gå med i handboken');
          }
        } catch (error) {
          console.error('Error joining handbook:', error);
          setError('Kunde inte gå med i handboken');
        } finally {
          setIsJoining(false);
        }
      }
    };

    joinHandbook();
  }, [user, handbookInfo, joinCode, router, isJoining]);

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Lösenorden matchar inte');
      return;
    }

    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      return;
    }

    setIsRegistering(true);

    try {
      // Sign up the user
      const { error: signUpError } = await signUp(email, password, {
        full_name: fullName,
        join_code: joinCode // Store join code in user metadata for later use
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess('Registrering lyckades! Kontrollera din e-post för att verifiera kontot, sedan kommer du automatiskt att gå med i handboken.');

    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Kunde inte registrera användare');
    } finally {
      setIsRegistering(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Validerar join-kod...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !handbookInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Ogiltig join-kod</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  Gå till vanlig registrering
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Framgång!</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
            {user && handbookInfo && (
              <div className="mt-4">
                <Button 
                  onClick={() => router.push(`/${handbookInfo.slug}`)}
                  className="w-full"
                >
                  Gå till {handbookInfo.title}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && isJoining) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Går med i handboken...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-blue-500" />
            <span>Gå med i handbok</span>
          </CardTitle>
          {handbookInfo && (
            <CardDescription className="flex items-center space-x-2">
              <Book className="h-4 w-4" />
              <span>Du är inbjuden till: <strong>{handbookInfo.title}</strong></span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {user ? (
            <div className="text-center">
              <p className="mb-4">Du är redan inloggad. Klicka för att gå med i handboken.</p>
              <Button 
                onClick={() => {
                  // This will trigger the useEffect above
                  setIsJoining(true);
                }}
                disabled={isJoining}
                className="w-full"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Går med...
                  </>
                ) : (
                  `Gå med i ${handbookInfo?.title}`
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegistration} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Fullständigt namn"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="E-postadress"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Lösenord (minst 6 tecken)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Bekräfta lösenord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" disabled={isRegistering} className="w-full">
                {isRegistering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrerar...
                  </>
                ) : (
                  'Skapa konto och gå med'
                )}
              </Button>
            </form>
          )}

          {handbookInfo?.expiresAt && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              Join-koden går ut: {new Date(handbookInfo.expiresAt).toLocaleDateString('sv-SE')}
            </p>
          )}

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Har du redan ett konto?{' '}
              <Link href={`/login?join=${joinCode}`} className="text-blue-600 hover:underline">
                Logga in här
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 