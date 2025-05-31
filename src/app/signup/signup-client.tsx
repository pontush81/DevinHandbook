"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { smartRedirect } from '@/lib/redirect-utils';

export default function SignupClient() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkIfLoggedIn() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          setRedirecting(true);
          // Use smart redirect logic
          setTimeout(() => {
            smartRedirect(user.id);
          }, 1000);
        }
      } catch (error) {
        console.error("Fel vid kontroll av inloggningsstatus:", error);
      } finally {
        setLoading(false);
      }
    }
    
    checkIfLoggedIn();
  }, [router]);

  // Om användaren är inloggad, visa lämpligt UI
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
        <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg border border-gray-100 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Du är inloggad
            </h1>
            <p className="text-gray-600 mb-6">
              Du är inloggad som <span className="font-semibold">{user.email}</span>
            </p>
            
            <div className="space-y-4">
              {redirecting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 mr-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span>Omdirigerar dig...</span>
                </div>
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
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Skapa ditt konto
          </h1>
          <p className="text-gray-600 mb-4">
            Första steget för att skapa din digitala handbok
          </p>
          <div className="flex justify-center items-center space-x-2 text-sm text-gray-500">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">1. Skapa konto</span>
            <span>→</span>
            <span className="text-gray-400">2. Verifiera e-post</span>
            <span>→</span>
            <span className="text-gray-400">3. Skapa handbok</span>
          </div>
        </div>

        {/* Form */}
        <SignUpForm />
        
      </div>
    </div>
  );
} 