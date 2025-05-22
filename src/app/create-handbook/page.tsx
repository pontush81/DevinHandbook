"use client";

import React, { useEffect, useState } from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { checkIsSuperAdmin } from "@/lib/user-utils";
import { CreateHandbookForm } from "@/components/handbook-wizard/CreateHandbookForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Handbook {
  id: string;
  name: string;
  subdomain: string;
  created_at: string;
  published: boolean;
}

export default function CreateHandbook() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [isLoadingHandbooks, setIsLoadingHandbooks] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/signup");
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

  useEffect(() => {
    if (!isLoadingHandbooks && handbooks.length > 0 && !isSuperadmin) {
      // Redirecta till första handboken
      router.push(`https://${handbooks[0].subdomain}.handbok.org`);
    }
  }, [isLoadingHandbooks, handbooks, isSuperadmin, router]);

  if (isLoading || isLoadingHandbooks) {
    return <div className="min-h-screen flex items-center justify-center"><div>Laddar...</div></div>;
  }

  if (handbooks.length > 0 && !isSuperadmin) {
    // Visa info om att handbok redan finns (fallback om redirect inte hinner)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <Card className="shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold mb-4">Du har redan en handbok</h1>
              <p className="text-gray-600 mb-6">Du kan redigera eller visa din handbok nedan.</p>
              <Button asChild className="w-full" size="lg">
                <a href={`https://${handbooks[0].subdomain}.handbok.org`}>
                  Gå till din handbok
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Endast superadmin eller användare utan handbok får skapa ny handbok
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
        </div>
        
        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            {user && <CreateHandbookForm userId={user.id} />}
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Endast superadmin eller användare utan handbok kan skapa en ny handbok.
          </p>
        </div>
      </div>
    </div>
  );
}
