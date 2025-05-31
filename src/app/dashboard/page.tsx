"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { checkIsSuperAdmin } from "@/lib/user-utils";
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Handbook {
  id: string;
  title: string;
  subdomain: string;
  created_at: string;
  published: boolean;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [isLoadingHandbooks, setIsLoadingHandbooks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    handbookId: string;
    handbookTitle: string;
  }>({
    isOpen: false,
    handbookId: '',
    handbookTitle: ''
  });

  useEffect(() => {
    if (!isLoading && !user) {
      console.log("Ingen användare hittad, omdirigerar till login...");
      
      // Enklare och mindre aggressiv omdirigering
      const timeoutId = setTimeout(() => {
        router.push("/login");
      }, 1000); // Ge AuthContext tid att ladda
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchSuperadmin = async () => {
      if (!user?.id || !user?.email) return;
      try {
        const isSuperAdmin = await checkIsSuperAdmin(
          supabase as any, 
          user.id, 
          user.email
        );
        setIsSuperadmin(isSuperAdmin);
      } catch (error) {
        console.error("Error checking superadmin status:", error);
        setIsSuperadmin(false);
      }
    };
    if (user) {
      fetchSuperadmin();
    }
  }, [user]);

  const fetchHandbooks = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingHandbooks(true);
      let data, error;
      if (isSuperadmin) {
        ({ data, error } = await supabase
          .from("handbooks")
          .select("*")
          .order("created_at", { ascending: false }));
      } else {
        ({ data, error } = await supabase
          .from("handbooks")
          .select("*")
          .eq("owner_id", user.id as any)
          .order("created_at", { ascending: false }));
      }
      if (error) throw error;
      setHandbooks((data as unknown as Handbook[]) || []);
    } catch (err: unknown) {
      console.error("Error fetching handbooks:", err);
      setError("Kunde inte hämta handböcker. Försök igen senare.");
    } finally {
      setIsLoadingHandbooks(false);
    }
  }, [user?.id, isSuperadmin]);

  useEffect(() => {
    if (user) {
      fetchHandbooks();
    }
  }, [user, fetchHandbooks, isSuperadmin]);

  const deleteHandbook = async (handbookId: string, title: string) => {
    // Öppna bekräftelsedialog istället för window.confirm
    setDeleteConfirmation({
      isOpen: true,
      handbookId,
      handbookTitle: title
    });
  };

  const confirmDeleteHandbook = async () => {
    const { handbookId, handbookTitle } = deleteConfirmation;
    
    if (!handbookId) return;
    
    try {
      setDeletingId(handbookId);
      setDeleteConfirmation({ isOpen: false, handbookId: '', handbookTitle: '' });
      
      // Delete the handbook
      const { error } = await supabase
        .from("handbooks")
        .delete()
        .eq("id", handbookId as any);

      if (error) throw error;

      // Remove from local state
      setHandbooks(prev => prev.filter(h => h.id !== handbookId));
      
      toast({
        title: "Handbok raderad",
        description: `"${handbookTitle}" har raderats framgångsrikt.`,
      });
      
    } catch (err: unknown) {
      console.error("Error deleting handbook:", err);
      setError("Kunde inte radera handboken. Försök igen senare.");
      toast({
        title: "Fel vid radering",
        description: "Kunde inte radera handboken. Försök igen senare.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDeleteHandbook = () => {
    setDeleteConfirmation({ isOpen: false, handbookId: '', handbookTitle: '' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12">
        <main className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-12">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Mina handböcker</h1>
              <p className="text-gray-600 mb-4 md:mb-0">Hantera dina digitala handböcker</p>
            </div>
            {(isSuperadmin || handbooks.length === 0) && (
              <Button asChild size="lg" className="shadow-md">
                <Link href="/create-handbook?new=true">
                  Skapa ny handbok
                </Link>
              </Button>
            )}
            {!isSuperadmin && handbooks.length >= 1 && (
              <Button size="lg" className="shadow-md bg-blue-600 hover:bg-blue-700">
                Uppgradera för fler handböcker
              </Button>
            )}
          </div>
          
          {error && (
            <Card className="mb-8 border-0 shadow-md bg-red-50">
              <CardContent className="p-4 text-red-600">
                {error}
              </CardContent>
            </Card>
          )}
          
          {isLoadingHandbooks ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : handbooks.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🎉</span>
                </div>
                <h2 className="text-xl font-medium mb-2">Välkommen till Handbok!</h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Grattis! Ditt konto är nu skapat. Nu är det dags att skapa din första digitala handbok för din bostadsrättsförening.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-medium text-blue-900 mb-2">Vad händer härnäst?</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✓ Du skapar en handbok med föreningens namn</li>
                    <li>✓ Du får en egen webbadress (t.ex. handbok.org/handbook/din-forening)</li>
                    <li>✓ Du fyller i grundläggande information</li>
                    <li>✓ Medlemmarna kan direkt börja använda handboken</li>
                  </ul>
                </div>
                <Button asChild size="lg">
                  <Link href="/create-handbook?new=true">
                    🚀 Skapa din första handbok
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Informationsruta för användare med en handbok */}
              {!isSuperadmin && handbooks.length === 1 && (
                <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">💡</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Vill du skapa fler handböcker?</h3>
                        <p className="text-gray-600 mb-4">
                          Du har din första handbok! För att skapa fler handböcker och få tillgång till avancerade funktioner, uppgradera till vårt Pro-konto.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            Uppgradera till Pro
                          </Button>
                          <Button variant="outline">
                            Läs mer om Pro-funktioner
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {handbooks.map((handbook) => (
                  <Card 
                    key={handbook.id} 
                    className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl">{handbook.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500 mb-4">
                        {new Date(handbook.created_at).toLocaleDateString("sv-SE")}
                      </p>
                      <div className="flex items-center mb-4">
                        <Badge variant="default" className={`${handbook.published ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}`}>
                          {handbook.published ? "Publicerad" : "Utkast"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-6">
                        <span className="font-medium">URL:</span>{" "}
                        handbok.org/handbook/{handbook.subdomain}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm"
                          asChild
                        >
                          <Link href={`/${handbook.subdomain}`}>
                            Redigera
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            window.open(`/handbook/${handbook.subdomain}`, '_blank');
                          }}
                        >
                          Visa
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteHandbook(handbook.id, handbook.title)}
                          disabled={deletingId === handbook.id}
                          className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 disabled:opacity-50"
                        >
                          {deletingId === handbook.id ? "Raderar..." : "Radera"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bekräftelsedialog för radering */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={cancelDeleteHandbook}>
        <DialogContent className="bg-white border border-gray-200 shadow-lg">
          <DialogHeader>
            <DialogTitle>Radera handbok</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill radera handboken "{deleteConfirmation.handbookTitle}"? 
              Detta kan inte ångras och all data kommer att försvinna permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={cancelDeleteHandbook}>
              Avbryt
            </Button>
            <Button 
              onClick={confirmDeleteHandbook}
              className="bg-red-600 hover:bg-red-700"
            >
              Radera handbok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
