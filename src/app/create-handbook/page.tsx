"use client";

import React, { useEffect, useState, Suspense, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { checkIsSuperAdmin } from "@/lib/user-utils";
import { CreateHandbookForm } from "./components/CreateHandbookForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from '@/types/supabase';

// Type från den riktiga databasen
type HandbookRow = Database['public']['Tables']['handbooks']['Row'];

interface Handbook {
  id: string;
  title: string;
  subdomain: string | null;
  created_at: string;
  published: boolean | null;
}

// Wrapper-komponent som använder useSearchParams säkert inom en Suspense-boundary
function CreateHandbookContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [isLoadingHandbooks, setIsLoadingHandbooks] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  
  // Use refs to prevent unnecessary re-renders
  const hasInitialized = useRef(false);
  const userIdRef = useRef<string | null>(null);
  
  // Memoize search params to prevent unnecessary re-renders
  const forceNewHandbook = useMemo(() => 
    searchParams?.get('new') === 'true', 
    [searchParams]
  );
  
  const [showCreateForm, setShowCreateForm] = useState(true);

  // Memoize redirect function to prevent re-creation
  const redirectToLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  // Only redirect if user changes from logged in to logged out
  useEffect(() => {
    if (!isLoading && !user && hasInitialized.current) {
      redirectToLogin();
    }
    if (user) {
      hasInitialized.current = true;
    }
  }, [user, isLoading, redirectToLogin]);

  // Memoize superadmin check to prevent unnecessary calls
  const checkSuperadmin = useCallback(async (userId: string) => {
    try {
      const isSuperAdmin = await checkIsSuperAdmin(
        supabase as any, 
        userId, 
        user?.email || ''
      );
      setIsSuperadmin(isSuperAdmin);
    } catch (error) {
      console.error("Error checking superadmin status:", error);
      setIsSuperadmin(false);
    }
  }, [user?.email]);

  // Only check superadmin when user ID actually changes
  useEffect(() => {
    if (user?.id && userIdRef.current !== user.id) {
      userIdRef.current = user.id;
      checkSuperadmin(user.id);
    }
  }, [user?.id, checkSuperadmin]);

  // Memoize handbook fetching to prevent unnecessary calls
  const fetchHandbooks = useCallback(async (userId: string) => {
    setIsLoadingHandbooks(true);
    try {
      const { data, error } = await (supabase as any)
        .from("handbooks")
        .select("id, title, slug, created_at, published")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      
      if (data && !error) {
        const mappedHandbooks: Handbook[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          subdomain: item.slug,
          created_at: item.created_at,
          published: item.published
        }));
        setHandbooks(mappedHandbooks);
      }
    } catch (error) {
      console.error("Error fetching handbooks:", error);
    } finally {
      setIsLoadingHandbooks(false);
    }
  }, []);

  // Only fetch handbooks when user ID actually changes
  useEffect(() => {
    if (user?.id && userIdRef.current === user.id) {
      fetchHandbooks(user.id);
    }
  }, [user?.id, fetchHandbooks]);

  // Handle force new handbook parameter - only set once
  useEffect(() => {
    if (forceNewHandbook && !showCreateForm) {
      setShowCreateForm(true);
    }
  }, [forceNewHandbook]); // Removed showCreateForm from dependencies

  // Memoize loading state to prevent flicker
  const isPageLoading = useMemo(() => 
    isLoading || (user && isLoadingHandbooks), 
    [isLoading, isLoadingHandbooks, user]
  );

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div>Laddar...</div>
        </div>
      </div>
    );
  }

  // Kontrollera om användaren redan har en handbok (begränsning för nya användare)
  if (handbooks.length >= 1 && !isSuperadmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 md:py-16 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
              Du har redan en handbok
            </h1>
            <p className="text-base md:text-xl text-gray-600 mb-6 md:mb-8 max-w-xl mx-auto px-2">
              Som ny användare kan du skapa en handbok. För att skapa fler handböcker behöver du uppgradera ditt konto.
            </p>
          </div>
          
          <Card className="shadow-lg border-0 mb-6 md:mb-8">
            <CardContent className="p-4 md:p-8">
              <div className="text-center space-y-4 md:space-y-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl md:text-3xl">📚</span>
                </div>
                
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-2">Din befintliga handbok</h3>
                  <div className="space-y-3 md:space-y-4">
                    {handbooks.map(handbook => (
                      <div key={handbook.id} className="p-3 md:p-4 border rounded-lg">
                        <h4 className="font-medium text-base md:text-lg">{handbook.title}</h4>
                        <p className="text-gray-500 mb-3 text-sm md:text-base break-all">handbok.org/{handbook.subdomain}</p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:space-y-0">
                          <Button asChild size="sm" className="w-full sm:w-auto">
                            <a href={`/${handbook.subdomain}`}>
                              Redigera handbok
                            </a>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                            <a href={`https://www.handbok.org/${handbook.subdomain}`} target="_blank" rel="noopener noreferrer">
                              Visa handbok
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-4 md:pt-6">
                  <h4 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">Vill du skapa fler handböcker?</h4>
                  <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">
                    Uppgradera till vårt Pro-konto för att skapa obegränsat antal handböcker, få avancerade funktioner och prioriterad support.
                  </p>
                  <div className="space-y-2 md:space-y-3">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-sm md:text-base">
                      Uppgradera till Pro
                    </Button>
                    <Button variant="outline" className="w-full text-sm md:text-base" onClick={() => router.push('/dashboard')}>
                      Gå till dashboard
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Visa lista över befintliga handböcker om användaren väljer att se dem (endast för superadmins)
  if (handbooks.length > 0 && !showCreateForm && !forceNewHandbook && isSuperadmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 md:py-16 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
              Dina handböcker
            </h1>
            <p className="text-base md:text-xl text-gray-600 mb-6 md:mb-8 max-w-xl mx-auto px-2">
              Du har {handbooks.length} handbok{handbooks.length > 1 ? 'er' : ''}. Du kan skapa en till eller hantera dina befintliga.
            </p>
          </div>
          
          <Card className="shadow-lg border-0 mb-8">
            <CardContent className="p-8">
              <ul className="space-y-4">
                {handbooks.map(handbook => (
                  <li key={handbook.id} className="p-4 border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                      <h3 className="font-medium text-lg">{handbook.title}</h3>
                      <p className="text-gray-500">handbok.org/handbook/{handbook.subdomain}</p>
                    </div>
                    <div className="mt-2 md:mt-0 space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={`https://www.handbok.org/${handbook.subdomain}`} target="_blank" rel="noopener noreferrer">
                          Visa
                        </a>
                      </Button>
                      <Button asChild size="sm">
                        <a href={`/handbook/${handbook.subdomain}`}>
                          Redigera
                        </a>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          
          <div className="text-center">
            <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Skapa ny handbok
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Visa formulär för att skapa ny handbok som standardläge
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 md:py-16 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
            Skapa digital handbok
          </h1>
          <p className="text-base md:text-xl text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto px-2 text-center">
            Följ stegen nedan för att skapa en skräddarsydd digital handbok för din förening.
          </p>
          {handbooks.length > 0 && isSuperadmin && (
            <Button variant="outline" className="mb-3 md:mb-4 text-sm md:text-base" onClick={() => router.push('/dashboard')}>
              Visa mina handböcker
            </Button>
          )}
        </div>
        
        <Card className="shadow-lg border-0">
          <CardContent className="p-4 md:p-8 lg:p-12">
            {user && <CreateHandbookForm />}
            <div className="mt-4 md:mt-6 text-gray-600 text-xs md:text-sm space-y-2">
              <p>När din handbok har skapats kommer du automatiskt få administratörsrättigheter och se en "Administrera"-knapp i handboken.</p>
              <p>Du kan använda denna knapp för att hantera innehåll och medlemmar i din handbok.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Huvudkomponenten som wrappar innehållet i en Suspense-boundary
export default function CreateHandbook() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div>Laddar...</div></div>}>
      <CreateHandbookContent />
    </Suspense>
  );
}
