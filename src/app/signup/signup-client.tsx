"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignUpForm } from "@/components/auth/SignUpForm";

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
          // Hämta användarens handböcker
          const { data, error: handbooksError } = await supabase
            .from("handbooks")
            .select("subdomain")
            .order("created_at", { ascending: false });
            
          if (!handbooksError && data && data.length > 0) {
            window.location.replace(`https://${data[0].subdomain}.handbok.org`);
          } else {
            router.replace("/dashboard");
          }
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
            Registrera konto
          </h1>
          <p className="text-gray-600">
            Skapa ditt konto för att komma igång med Handbok.org
          </p>
        </div>

        {/* Form */}
        <SignUpForm />
        
      </div>
    </div>
  );
} 