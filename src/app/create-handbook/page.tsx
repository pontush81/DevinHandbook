"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { checkIsSuperAdmin } from "@/lib/user-utils";
import { CreateHandbookForm } from "@/components/handbook-wizard/CreateHandbookForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Handbook {
  id: string;
  title: string;
  subdomain: string;
  created_at: string;
  published: boolean;
}

// Wrapper-komponent som använder useSearchParams säkert inom en Suspense-boundary
function CreateHandbookContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [isLoadingHandbooks, setIsLoadingHandbooks] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  // Kontrollera query-parametern new=true för att avgöra om formuläret ska visas initialt
  const forceNewHandbook = searchParams?.get('new') === 'true';
  // Om forceNewHandbook är true, ska vi alltid visa formuläret
  const [showCreateForm, setShowCreateForm] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchSuperadmin = async () => {
      if (!user) return;
      try {
        // Använd den nya hjälpfunktionen som säkerställer att profilen finns
        const isSuperAdmin = await checkIsSuperAdmin(
          supabase, 
          user.id, 
          user.email || ''
        );
        setIsSuperadmin(isSuperAdmin);
      } catch (error) {
        console.error("Error checking superadmin status:", error);
        setIsSuperadmin(false);
      }
    };
    if (user) fetchSuperadmin();
  }, [user]);

  useEffect(() => {
    const fetchHandbooks = async () => {
      if (!user) return;
      setIsLoadingHandbooks(true);
      const { data, error } = await supabase
        .from("handbooks")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      setHandbooks(data || []);
      setIsLoadingHandbooks(false);
    };
    if (user) fetchHandbooks();
  }, [user]);

  // När searchParams ändras och new=true är satt, visa alltid formuläret
  useEffect(() => {
    if (forceNewHandbook) {
      setShowCreateForm(true);
    }
  }, [forceNewHandbook]);

  if (isLoading || isLoadingHandbooks) {
    return <div className="min-h-screen flex items-center justify-center"><div>Laddar...</div></div>;
  }

  // Visa lista över befintliga handböcker om användaren väljer att se dem
  if (handbooks.length > 0 && !showCreateForm && !forceNewHandbook) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Dina handböcker
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-xl mx-auto">
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
                      <p className="text-gray-500">www.handbok.org/{handbook.subdomain}</p>
                    </div>
                    <div className="mt-2 md:mt-0 space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={`https://www.handbok.org/${handbook.subdomain}`} target="_blank" rel="noopener noreferrer">
                          Visa
                        </a>
                      </Button>
                      <Button asChild size="sm">
                        <a href={`/edit-handbook/${handbook.id}`}>
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
            <Button onClick={() => setShowCreateForm(true)}>
              Skapa ny handbok
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Visa formulär för att skapa ny handbok som standardläge
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Skapa digital handbok
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-xl mx-auto">
            Följ stegen nedan för att skapa en skräddarsydd digital handbok för din förening.
          </p>
          {handbooks.length > 0 && (
            <Button variant="outline" className="mb-4" onClick={() => router.push('/dashboard')}>
              Visa mina handböcker
            </Button>
          )}
        </div>
        
        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            {user && <CreateHandbookForm userId={user.id} />}
            <div className="mt-6 text-gray-600 text-sm">
              <p>När din handbok har skapats kommer du automatiskt få administratörsrättigheter och se en "Administrera"-knapp i handboken.</p>
              <p className="mt-2">Du kan använda denna knapp för att hantera innehåll och medlemmar i din handbok.</p>
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
