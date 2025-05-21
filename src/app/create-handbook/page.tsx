"use client";

import React, { useEffect, useState } from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { checkIsSuperAdmin } from "@/lib/user-utils";
import { CreateHandbookForm } from "@/components/handbook-wizard/CreateHandbookForm";

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
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] px-2">
        <main className="w-full max-w-2xl mx-auto bg-white rounded-3xl p-8 md:p-12 flex flex-col gap-8 shadow-none border border-gray-100 text-center">
          <h1 className="text-3xl font-bold mb-2">Du har redan en handbok</h1>
          <p className="text-gray-500 text-lg mb-6">Du kan redigera eller visa din handbok nedan.</p>
          <a
            href={`https://${handbooks[0].subdomain}.handbok.org`}
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            Gå till din handbok
          </a>
        </main>
      </div>
    );
  }

  // Endast superadmin eller användare utan handbok får skapa ny handbok
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] px-2">
      <main className="w-full max-w-2xl mx-auto bg-white rounded-3xl p-8 md:p-12 flex flex-col gap-8 shadow-none border border-gray-100">
        <div className="mb-2 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Skapa digital handbok</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Följ stegen nedan för att skapa en skräddarsydd digital handbok för din förening.</p>
        </div>
        
        {user && <CreateHandbookForm userId={user.id} />}
        
        <div className="text-center mt-4">
          <p className="text-gray-500 text-sm">Endast superadmin eller användare utan handbok kan skapa en ny handbok.</p>
        </div>
      </main>
    </div>
  );
}
