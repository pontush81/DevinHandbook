"use client";

import { useEffect, useState, useLayoutEffect } from "react";
import { supabase, fetchWithAuth } from "@/lib/supabase";
import { safeLocalStorage } from "@/lib/safe-storage";
import { useRouter, useSearchParams } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { smartRedirect } from '@/lib/redirect-utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Book, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface HandbookInfo {
  id: string;
  title: string;
  slug: string;
  expiresAt: string | null;
}

export default function SignupClient() {
  console.log('[SignupClient] ===== COMPONENT FUNCTION CALLED =====');
  console.log('[SignupClient] Component starting to render');
  
  const [loading, setLoading] = useState(true);
  console.log('[SignupClient] useState hooks initialized');
  
  const [user, setUser] = useState<User | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  console.log('[SignupClient] useRouter called');
  
  const searchParams = useSearchParams();
  console.log('[SignupClient] useSearchParams called');
  
  console.log('[SignupClient] searchParams.get("join"):', searchParams.get('join'));
  
  // Join code related state
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [handbookInfo, setHandbookInfo] = useState<HandbookInfo | undefined>(undefined);
  const [joinCodeValidating, setJoinCodeValidating] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isExistingMember, setIsExistingMember] = useState(false);

  console.log('[SignupClient] Current state:', {
    loading,
    user: user?.email,
    redirecting,
    joinCode,
    handbookInfo: handbookInfo?.title,
    joinCodeValidating,
    joinCodeError,
    isJoining,
    joinSuccess,
    hasRedirected,
    isExistingMember
  });

  // Set joining flags immediately when component mounts with join code
  useLayoutEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    console.log('[useLayoutEffect] Running immediately on mount');
    console.log('[useLayoutEffect] Current URL:', window.location.href);
    const joinParam = searchParams.get('join');
    console.log('[useLayoutEffect] Join code from URL:', joinParam);
    
    // If we have a join code, set the joining flag immediately to prevent smartRedirect
    if (joinParam) {
      console.log('[useLayoutEffect] Setting joining flags immediately for join code:', joinParam);
      safeLocalStorage.setItem('joining_handbook_via_code', 'true');
      safeLocalStorage.setItem('pending_join_code', joinParam);
      safeLocalStorage.setItem('join_process_started', Date.now().toString());
      
      // Set a flag to indicate we're in join mode
      window.__joining_handbook = true;
      console.log('[useLayoutEffect] Set window.__joining_handbook to true');
    }
  }, [searchParams]);

  // Check for join code in URL or localStorage
  useEffect(() => {
    console.log('[UseEffect-JoinCode] Running with searchParams:', searchParams.toString());
    const joinParam = searchParams.get('join');
    const storedJoinCode = safeLocalStorage.getItem('pending_join_code');
    console.log('[UseEffect-JoinCode] joinParam value:', joinParam, 'stored:', storedJoinCode);
    
    if (joinParam) {
      console.log('[UseEffect-JoinCode] Found join code in URL:', joinParam);
      // Store it in localStorage for persistence
      safeLocalStorage.setItem('pending_join_code', joinParam);
      setJoinCode(joinParam);
      validateJoinCode(joinParam);
    } else if (storedJoinCode) {
      console.log('[UseEffect-JoinCode] Found stored join code:', storedJoinCode);
      setJoinCode(storedJoinCode);
      validateJoinCode(storedJoinCode);
    } else {
      console.log('[UseEffect-JoinCode] No join code found in URL or storage');
      setJoinCode(''); // Set empty string to distinguish from null (loading)
    }
  }, [searchParams]);

  const validateJoinCode = async (code: string) => {
    setJoinCodeValidating(true);
    setJoinCodeError(null);
    
    try {
      const response = await fetch(`/api/handbook/join?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setHandbookInfo(data.handbook);
        console.log(`✅ [Join Code Valid] Du kommer att gå med i handbok: "${data.handbook.title}"`);
      } else {
        setJoinCodeError(data.message || 'Ogiltig join-kod');
      }
    } catch (error) {
      console.error('Error validating join code:', error);
      setJoinCodeError('Kunde inte validera join-kod');
    } finally {
      setJoinCodeValidating(false);
    }
  };

  // Join handbook after successful registration
  const handleJoinHandbook = async (newUser: User) => {
    if (!joinCode || !handbookInfo) return;

    // Check if user has confirmed email - if not, they should go through email confirmation flow
    // Exception: In development, email confirmation might be disabled, so allow join anyway
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!newUser.email_confirmed_at && !isDevelopment) {
      console.log('[Join] User needs email confirmation first, join will be handled by auth callback');
      return;
    } else if (!newUser.email_confirmed_at && isDevelopment) {
      console.log('[Join] Development mode: Proceeding with join despite unconfirmed email');
    }

    setIsJoining(true);
    try {
      // Use fetchWithAuth to automatically include Bearer token when cookies fail
      const response = await fetchWithAuth('/api/handbook/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode }),
      });

      const data = await response.json();
      
      console.log('[HandleJoinHandbook] Response:', { status: response.status, ok: response.ok, data });

      if (response.ok && data.success) {
        console.log('[HandleJoinHandbook] Join successful, setting joinSuccess to true');
        console.log('[HandleJoinHandbook] Response data:', data);
        console.log('[HandleJoinHandbook] HandbookInfo:', handbookInfo);
        
        // Handle both new members and existing members gracefully
        if (data.already_member) {
          console.log('[HandleJoinHandbook] User is already a member with role:', data.current_role);
          // For existing members, show a different message and redirect faster
          setJoinSuccess(true);
          setIsExistingMember(true);
          setTimeout(() => {
            const targetUrl = `/${handbookInfo.slug}`;
            console.log('[HandleJoinHandbook] Redirecting existing member to:', targetUrl);
            
            if (hasRedirected) {
              console.log('[HandleJoinHandbook] Already redirected, skipping');
              return;
            }
            
            setHasRedirected(true);
            router.push(targetUrl);
          }, 1000); // Faster redirect for existing members
        } else {
          console.log('[HandleJoinHandbook] New member joined with role:', data.role);
          setJoinSuccess(true);
          // Normal redirect flow for new members
          setTimeout(() => {
            const targetUrl = `/${handbookInfo.slug}`;
            console.log('[HandleJoinHandbook] About to redirect to:', targetUrl);
            
            if (hasRedirected) {
              console.log('[HandleJoinHandbook] Already redirected, skipping');
              return;
            }
            
            setHasRedirected(true);
            router.push(targetUrl);
            
            // Backup redirect after another 1 second
            setTimeout(() => {
              console.log('[HandleJoinHandbook] Backup redirect to:', targetUrl);
              if (!hasRedirected) {
                console.log('[HandleJoinHandbook] Router.push failed, using window.location');
                window.location.href = targetUrl;
              }
            }, 1000);
          }, 2000);
        }
      } else {
        console.log('[HandleJoinHandbook] Join failed:', data);
        
        // Improved error handling based on response
        if (response.status === 400) {
          // Handle specific error messages from the improved API
          if (data.message && data.message.includes('redan medlem')) {
            // This should now be handled as success, but just in case
            setJoinCodeError(`Du är redan medlem i "${handbookInfo.title}".`);
          } else if (data.message && data.message.includes('utgången')) {
            setJoinCodeError('Join-koden har gått ut. Kontakta administratören för en ny kod.');
          } else if (data.message && data.message.includes('ogiltig')) {
            setJoinCodeError('Join-koden är ogiltig. Kontrollera att du har skrivit in den korrekt.');
          } else {
            setJoinCodeError(data.message || `Kunde inte gå med i "${handbookInfo.title}".`);
          }
        } else if (response.status === 409) {
          // Conflict - likely duplicate email or similar
          setJoinCodeError('Det finns redan ett konto med din e-postadress. Försök logga in istället.');
        } else {
          setJoinCodeError(data.message || 'Kunde inte gå med i handboken');
        }
      }
    } catch (error) {
      console.error('Error joining handbook:', error);
      setJoinCodeError('Ett oväntat fel inträffade. Försök igen senare.');
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    console.log('[UseEffect-CheckLogin] Running with dependencies:', { 
      joinCode, 
      handbookInfo: handbookInfo?.title, 
      joinSuccess, 
      hasRedirected 
    });
    
    async function checkIfLoggedIn() {
      try {
        console.log('[UseEffect] Starting checkIfLoggedIn');
        const { data: { user } } = await supabase.auth.getUser();
        console.log('[UseEffect] Got user from supabase:', user?.email);
        setUser(user);
        
        if (user) {
          console.log('[UseEffect] User found:', user.email);
          console.log('[UseEffect] Current joinCode state:', joinCode, 'type:', typeof joinCode);
          console.log('[UseEffect] Current handbookInfo state:', handbookInfo?.title);
          
          // If user is logged in and has a join code, try to join automatically
          if (joinCode && handbookInfo) {
            console.log('[UseEffect] User has join code and handbook info, calling handleJoinHandbook');
            console.log('[UseEffect] JoinSuccess state:', joinSuccess, 'HasRedirected:', hasRedirected);
            
            // Don't call handleJoinHandbook if we've already succeeded or redirected
            if (!joinSuccess && !hasRedirected) {
              console.log('[UseEffect] Calling handleJoinHandbook...');
              await handleJoinHandbook(user);
            } else {
              console.log('[UseEffect] Already joined or redirected, skipping handleJoinHandbook');
            }
            // NOTE: Don't use smartRedirect here - let the join result determine what happens
          } else if (joinCode === '') {
            console.log('[UseEffect] No join code (confirmed), checking if joining handbook via code...');
            
            // Check if user is currently joining a handbook via code - if so, don't redirect
            const joiningFlag = safeLocalStorage.getItem('joining_handbook_via_code');
            console.log('[UseEffect] Joining flag:', joiningFlag);
            
            if (joiningFlag === 'true') {
              console.log('[UseEffect] User is joining handbook via code, skipping smartRedirect');
              return;
            }
            
            // Only use smart redirect if we're certain there's no join code (empty string) and not joining
            setRedirecting(true);
            setTimeout(() => {
              console.log('[UseEffect] Calling smartRedirect with userId:', user.id);
              smartRedirect(user.id);
            }, 1000);
          } else if (joinCode === null) {
            console.log('[UseEffect] Join code detection still loading, waiting...');
          } else if (joinCode && !handbookInfo) {
            console.log('[UseEffect] Join code exists but no handbookInfo yet, waiting...');
          }
          // NOTE: If there's a joinCode but no handbookInfo yet, wait for validation
          // If there's a joinCodeError, we'll show that in the UI instead of redirecting
        } else {
          console.log('[UseEffect] No user found');
        }
      } catch (error) {
        console.error("Fel vid kontroll av inloggningsstatus:", error);
      } finally {
        console.log('[UseEffect] Setting loading to false');
        setLoading(false);
      }
    }
    
    checkIfLoggedIn();
  }, [router, joinCode, handbookInfo, joinSuccess, hasRedirected]); // Add new dependencies to prevent re-runs when already processed

  // Success state for joining handbook
  if (joinSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>{isExistingMember ? 'Välkommen tillbaka!' : 'Välkommen!'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                {isExistingMember 
                  ? `Du är redan medlem i <strong>${handbookInfo?.title}</strong>. Du omdirigeras dit nu...`
                  : `Du har gått med i <strong>${handbookInfo?.title}</strong>! Du omdirigeras dit nu...`
                }
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>Omdirigerar...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Om användaren är inloggad och joinar
  if (user && isJoining) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
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

  // Om användaren är inloggad, visa lämpligt UI
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
        <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg border border-gray-100 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {joinCodeError ? "Kunde inte gå med i handboken" : "Du är inloggad"}
            </h1>
            <p className="text-gray-600 mb-6">
              Du är inloggad som <span className="font-semibold">{user.email}</span>
            </p>
            
            {/* Show join code error if present */}
            {joinCodeError && handbookInfo && (
              <div className="mb-6">
                <Alert className="text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{joinCodeError}</AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Only show redirecting state if there's confirmed no join code and no join error */}
              {redirecting && joinCode === '' && !joinCodeError ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 mr-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span>Omdirigerar dig...</span>
                </div>
              ) : (
                <>
                  {/* If there's a join code error, show relevant options */}
                  {joinCodeError && handbookInfo ? (
                    <>
                      <Link href={`/${handbookInfo.slug}`}>
                        <Button className="w-full">
                          Gå till {handbookInfo.title}
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={async () => {
                          await supabase.auth.signOut();
                          setUser(null);
                          // Keep the join code in the URL for the next user
                          window.location.href = `/signup?join=${joinCode}`;
                        }}
                      >
                        Logga ut och försök med annat konto
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/dashboard">
                        <Button className="w-full">
                          Gå till dashboard
                        </Button>
                      </Link>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={async () => {
                          await supabase.auth.signOut();
                          setUser(null);
                          window.location.reload();
                        }}
                      >
                        Logga ut
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
        <div className="flex items-center">
          <div className="animate-spin h-5 w-5 mr-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Laddar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full">
        
        {/* Join Code Information */}
        {joinCode && (
          <div className="mb-6">
            {joinCodeValidating ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Validerar join-kod...</span>
                  </div>
                </CardContent>
              </Card>
            ) : joinCodeError ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{joinCodeError}</AlertDescription>
              </Alert>
            ) : handbookInfo ? (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-900">
                    <Key className="h-5 w-5" />
                    <span>Inbjudan till handbok</span>
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-2">
                    <Book className="h-4 w-4" />
                    <span>Du är inbjuden till: <strong>{handbookInfo.title}</strong></span>
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {joinCode ? 'Skapa konto och gå med' : 'Skapa ditt konto'}
          </h1>
          <p className="text-gray-600 mb-4">
            {joinCode 
              ? `Skapa ett konto för att gå med i ${handbookInfo?.title || 'handboken'}`
              : 'Första steget för att skapa din digitala handbok'
            }
          </p>
          {!joinCode && (
            <div className="flex justify-center items-center space-x-2 text-sm text-gray-500">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">1. Skapa konto</span>
              <span>→</span>
              <span className="text-gray-400">2. Verifiera e-post</span>
              <span>→</span>
              <span className="text-gray-400">3. Skapa handbok</span>
            </div>
          )}
        </div>

        {/* Form */}
        <SignUpForm 
          onSuccess={handbookInfo ? handleJoinHandbook : undefined}
          joinCode={joinCode}
        />
        
      </div>
    </div>
  );
} 