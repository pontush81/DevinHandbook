"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Handbook {
  id: string;
  name: string;
  subdomain: string;
  created_at: string;
  published: boolean;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [isLoadingHandbooks, setIsLoadingHandbooks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const fetchHandbooks = useCallback(async () => {
    try {
      setIsLoadingHandbooks(true);
      
      const { data, error } = await supabase
        .from("handbooks")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setHandbooks(data || []);
    } catch (err: unknown) {
      console.error("Error fetching handbooks:", err);
      setError("Kunde inte hämta handböcker. Försök igen senare.");
    } finally {
      setIsLoadingHandbooks(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchHandbooks();
    }
  }, [user, fetchHandbooks]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            Handbok.org
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-gray-600 hover:text-black"
            >
              Logga ut
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Mina handböcker</h1>
          <Link
            href="/create-handbook"
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
          >
            Skapa ny handbok
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md mb-6">
            {error}
          </div>
        )}

        {isLoadingHandbooks ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : handbooks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-xl font-medium mb-2">Inga handböcker ännu</h2>
            <p className="text-gray-500 mb-6">
              Du har inte skapat några handböcker ännu. Kom igång genom att skapa din första handbok.
            </p>
            <Link
              href="/create-handbook"
              className="inline-block bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
            >
              Skapa din första handbok
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {handbooks.map((handbook) => (
              <div
                key={handbook.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <h2 className="text-xl font-medium mb-2">{handbook.name}</h2>
                  <p className="text-gray-500 mb-4">
                    {new Date(handbook.created_at).toLocaleDateString("sv-SE")}
                  </p>
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        handbook.published ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    ></span>
                    {handbook.published ? "Publicerad" : "Utkast"}
                  </div>
                  <div className="text-sm text-gray-500 mb-6">
                    <span className="font-medium">Subdomän:</span>{" "}
                    {handbook.subdomain}.handbok.org
                  </div>
                  <div className="flex space-x-3">
                    <a
                      href={`https://${handbook.subdomain}.handbok.org`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-black hover:underline"
                    >
                      Visa
                    </a>
                    <Link
                      href={`/edit-handbook/${handbook.id}`}
                      className="text-sm text-black hover:underline"
                    >
                      Redigera
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
