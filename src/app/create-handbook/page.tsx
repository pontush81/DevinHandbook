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
  const [hasCheckedHandbooks, setHasCheckedHandbooks] = useState(false);
  
  // Use refs to prevent unnecessary re-renders
  const hasInitialized = useRef(false);
  
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

  // Check superadmin status when user is available
  useEffect(() => {
    if (user?.id) {
      const checkSuperadmin = async () => {
        try {
          const isSuperAdmin = await checkIsSuperAdmin(
            supabase as any, 
            user.id, 
            user.email || ''
          );
          setIsSuperadmin(isSuperAdmin);
        } catch (error) {
          console.error("Error checking superadmin status:", error);
          setIsSuperadmin(false);
        }
      };
      checkSuperadmin();
    }
  }, [user?.id, user?.email]);

  // Fetch handbooks when user is available
  useEffect(() => {
    if (user?.id && !hasCheckedHandbooks) {
      const fetchHandbooks = async () => {
        setIsLoadingHandbooks(true);
        try {
          const { data, error } = await (supabase as any)
            .from("handbooks")
            .select("id, title, slug, created_at, published")
            .eq("owner_id", user.id)
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
          setHasCheckedHandbooks(true);
        } catch (error) {
          console.error("Error fetching handbooks:", error);
          setHasCheckedHandbooks(true);
        } finally {
          setIsLoadingHandbooks(false);
        }
      };
      
      fetchHandbooks();
    }
  }, [user?.id, hasCheckedHandbooks]);

  // Handle force new handbook parameter
  useEffect(() => {
    console.log('🎯 [CreateHandbook] forceNewHandbook:', forceNewHandbook);
    if (forceNewHandbook) {
      console.log('🎯 [CreateHandbook] Setting showCreateForm to true due to forceNewHandbook');
      setShowCreateForm(true);
    }
  }, [forceNewHandbook]);

  // Show loading state while checking authentication and handbooks
  if (isLoading || (user && isLoadingHandbooks)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div>Laddar...</div>
        </div>
      </div>
    );
  }

  // If not logged in, don't show anything (redirect will happen)
  if (!user) {
    return null;
  }

  // Debug logging
  console.log('🎯 [CreateHandbook] Render decision:', {
    handbooksLength: handbooks.length,
    showCreateForm,
    forceNewHandbook,
    isSuperadmin,
    shouldShowList: handbooks.length > 0 && !showCreateForm && !forceNewHandbook && isSuperadmin
  });

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 md:py-16 px-6 md:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center mb-8 md:mb-12 w-full">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6 text-center">
            Skapa digital handbok
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-xl px-4 text-center">
            AI-driven handbok på 2 minuter
          </p>
          {handbooks.length > 0 && isSuperadmin && (
            <Button variant="outline" className="mb-3 md:mb-4 text-sm md:text-base" onClick={() => router.push('/dashboard')}>
              Visa mina handböcker
            </Button>
          )}
        </div>
        
        <Card className="shadow-lg border-0">
          <CardContent className="p-6 md:p-8 lg:p-12">
            {user && <CreateHandbookForm />}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                🎯 Du blir automatiskt admin när handboken är klar
              </p>
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
