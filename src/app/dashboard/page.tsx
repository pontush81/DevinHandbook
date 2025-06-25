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
import { getProPricing } from '@/lib/pricing';
import { getTrialStatus, getHandbookTrialStatus, TrialStatus } from '@/lib/trial-service';
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
  owner_id?: string;
  userRole?: string;
  handbook_members?: Array<{ role: string }>;
  trialStatus?: TrialStatus;
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
      router.replace("/login"); // Use replace instead of push to avoid history entry
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
          .select("id, title, slug, created_at, published, owner_id")
          .order("created_at", { ascending: false }));
      } else {
        // Först hämta handböcker som användaren äger
        const { data: ownedHandbooks, error: ownedError } = await supabase
          .from("handbooks")
          .select("id, title, slug, created_at, published, owner_id")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (ownedError) throw ownedError;

        // Sedan hämta handböcker där användaren är medlem (men inte ägare)
        const { data: memberHandbooks, error: memberError } = await supabase
          .from("handbooks")
          .select(`
            id, 
            title, 
            slug, 
            created_at, 
            published,
            owner_id,
            handbook_members!inner(role)
          `)
          .eq("handbook_members.user_id", user.id)
          .neq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (memberError) throw memberError;

        // Kombinera resultaten
        data = [
          ...(ownedHandbooks || []).map(h => ({ ...h, handbook_members: [{ role: 'admin' }] })),
          ...(memberHandbooks || [])
        ] as any[];
        
        // Sortera efter created_at igen efter sammanslagning
        data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      
      // Map slug to subdomain for interface compatibility and add role info
      const mappedData = (data || []).map(handbook => {
        const userRole = handbook.owner_id === user.id ? 'admin' : handbook.handbook_members?.[0]?.role || 'viewer';
        return {
          ...handbook,
          subdomain: handbook.slug,
          // Sätt användarens roll - ägare är alltid admin, annars använd rollen från handbook_members
          userRole
        };
      });
      
      // Fetch trial status for each handbook
      const handbooksWithTrialStatus = await Promise.all(
        mappedData.map(async (handbook) => {
          try {
            // Only fetch trial status for handbooks the user owns or has admin access to
            if (handbook.userRole === 'admin' || isSuperadmin) {
              const trialStatus = await getHandbookTrialStatus(user.id, handbook.id);
              return { ...handbook, trialStatus };
            }
            return handbook;
          } catch (error) {
            console.error(`Error fetching trial status for handbook ${handbook.id}:`, error);
            return handbook;
          }
        })
      );
      
      setHandbooks(handbooksWithTrialStatus as Handbook[]);
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



  // Hantera lyckad uppgradering från URL (webhook borde ha triggats)
  useEffect(() => {
    const handleUpgradeSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const upgraded = urlParams.get('upgraded');
      
      if (upgraded === 'true' && user?.id) {
        console.log('🔄 Detected successful upgrade return, refreshing status...');
        
        try {
          // Vänta lite för att webhook ska hinna köra
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Uppdatera handböcker (som nu inkluderar trial-status)
          await fetchHandbooks();
          
          toast({
            title: "Uppgradering lyckades! 🎉",
            description: "Din handbok är nu aktiv och betald.",
          });
          
          // Rensa URL-parametrar
          window.history.replaceState({}, '', '/dashboard');
        } catch (error) {
          console.error('Error refreshing status:', error);
        }
      }
    };

    if (user) {
      handleUpgradeSuccess();
    }
  }, [user, fetchHandbooks, toast]);

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

  const handleUpgradeClick = async () => {
    setIsLoadingHandbooks(true);
    
    try {
      if (!user) {
        toast({
          title: "Fel",
          description: "Du måste vara inloggad för att uppgradera.",
          variant: "destructive",
        });
        return;
      }

      // Skapa Stripe checkout session för årsprenumeration
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planType: 'yearly', // Förvald årsprenumeration för bättre värde
          successUrl: `${window.location.origin}/dashboard?upgraded=true`,
          cancelUrl: `${window.location.origin}/dashboard?upgrade_cancelled=true`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Misslyckades att skapa betalning');
      }

      // Omdirigera till Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Ingen betalnings-URL mottagen');
      }

    } catch (error) {
      console.error('Fel vid uppgradering:', error);
      toast({
        title: "Fel vid uppgradering",
        description: error instanceof Error ? error.message : "Något gick fel. Försök igen senare.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHandbooks(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  // Räkna antal handböcker som användaren äger
  const ownedHandbooks = handbooks.filter(h => h.userRole === 'admin');
  const memberHandbooks = handbooks.filter(h => h.userRole !== 'admin');
  const pricing = getProPricing();

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12">
        <main className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-12">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Mina handböcker</h1>
              <p className="text-gray-600 mb-4 md:mb-0">Handböcker du äger eller är medlem i</p>
            </div>
            <Button asChild size="lg" className="shadow-md">
              <Link href="/create-handbook?new=true">
                {ownedHandbooks.length === 0 && memberHandbooks.length > 0 
                  ? "Skapa din egen handbok" 
                  : "Skapa ny handbok"}
              </Link>
            </Button>

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
                    <li>✓ Du får en egen webbadress (t.ex. handbok.org/din-forening)</li>
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


              {/* Informationsruta för användare som bara är medlemmar */}
              {!isSuperadmin && ownedHandbooks.length === 0 && memberHandbooks.length > 0 && (
                <Card className="border-0 shadow-md bg-gradient-to-r from-green-50 to-blue-50">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">👥</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Vill du skapa din egen handbok?</h3>
                        <p className="text-gray-600 mb-4">
                          Du är medlem i {memberHandbooks.length} handbok{memberHandbooks.length > 1 ? 'er' : ''}. Om du vill skapa och hantera din egen handbok för din förening, kan du komma igång här.
                        </p>
                                                 <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                           <Link href="/create-handbook?new=true">
                             Skapa din egen handbok
                           </Link>
                         </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Gruppera handböcker efter användarens roll */}
              {ownedHandbooks.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>👑</span> Handböcker du äger
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ownedHandbooks.map((handbook) => (
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
                          <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <Badge variant="default" className={`${handbook.published ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}`}>
                              {handbook.published ? "Publicerad" : "Utkast"}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="border-blue-200 text-blue-800 bg-blue-50"
                            >
                              👑 Ägare
                            </Badge>
                            {/* Payment Status Badge */}
                            {handbook.trialStatus && (
                              <Badge 
                                variant="outline" 
                                className={`${
                                  handbook.trialStatus.subscriptionStatus === 'active' 
                                    ? 'border-green-200 text-green-800 bg-green-50' 
                                    : handbook.trialStatus.isInTrial
                                    ? 'border-orange-200 text-orange-800 bg-orange-50'
                                    : 'border-red-200 text-red-800 bg-red-50'
                                }`}
                              >
                                {handbook.trialStatus.subscriptionStatus === 'active' 
                                  ? '💳 Betald' 
                                  : handbook.trialStatus.isInTrial
                                  ? `🔄 Trial (${handbook.trialStatus.trialDaysRemaining}d)`
                                  : '⚠️ Trial utgången'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mb-4">
                            <span className="font-medium">URL:</span>{" "}
                            <p className="text-gray-500 mb-2">
                              handbok.org/{handbook.subdomain}
                            </p>
                          </div>
                          
                          {/* Upgrade-knapp för handbok-ägare - endast om INTE aktiv subscription */}
                          {!isSuperadmin && handbook.trialStatus && handbook.trialStatus.subscriptionStatus !== 'active' && (
                            <div className="mb-4">
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                                onClick={() => {
                                  window.location.href = `/upgrade?handbookId=${handbook.id}`;
                                }}
                                disabled={isLoadingHandbooks}
                              >
                                {isLoadingHandbooks ? "Skapar betalning..." : `Uppgradera (${pricing.yearly})`}
                              </Button>
                              {handbook.trialStatus.isInTrial && (
                                <p className="text-xs text-gray-600 mt-1 text-center">
                                  {handbook.trialStatus.trialDaysRemaining} dagar kvar av gratis trial
                                </p>
                              )}
                            </div>
                          )}

                          {/* Status för aktiv subscription */}
                          {!isSuperadmin && handbook.trialStatus && handbook.trialStatus.subscriptionStatus === 'active' && (
                            <div className="mb-4">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center text-green-800">
                                  <span className="text-sm font-medium">✅ Aktiv prenumeration</span>
                                </div>
                                <p className="text-xs text-green-600 mt-1">
                                  Denna handbok är betald och aktiv
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button 
                              size="sm"
                              asChild
                            >
                              <Link href={`/${handbook.subdomain}`}>
                                Hantera
                              </Link>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                window.open(`/${handbook.subdomain}`, '_blank');
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

              {/* Medlemshandböcker */}
              {memberHandbooks.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>👥</span> Handböcker du är medlem i
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {memberHandbooks.map((handbook) => (
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
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <Badge variant="default" className={`${handbook.published ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}`}>
                          {handbook.published ? "Publicerad" : "Utkast"}
                        </Badge>
                        {handbook.userRole && (
                          <Badge 
                            variant="outline" 
                            className={`${
                              handbook.userRole === 'admin' 
                                ? 'border-blue-200 text-blue-800 bg-blue-50' 
                                : handbook.userRole === 'editor'
                                ? 'border-yellow-200 text-yellow-800 bg-yellow-50'
                                : 'border-gray-200 text-gray-600 bg-gray-50'
                            }`}
                          >
                            {handbook.userRole === 'admin' ? '👑 Ägare' : 
                             handbook.userRole === 'editor' ? '✏️ Redaktör' : 
                             '👁️ Medlem'}
                          </Badge>
                        )}
                        {/* Payment Status Badge for member handbooks */}
                        {handbook.trialStatus && (
                          <Badge 
                            variant="outline" 
                            className={`${
                              handbook.trialStatus.subscriptionStatus === 'active' 
                                ? 'border-green-200 text-green-800 bg-green-50' 
                                : handbook.trialStatus.isInTrial
                                ? 'border-orange-200 text-orange-800 bg-orange-50'
                                : 'border-red-200 text-red-800 bg-red-50'
                            }`}
                          >
                            {handbook.trialStatus.subscriptionStatus === 'active' 
                              ? '💳 Betald' 
                              : handbook.trialStatus.isInTrial
                              ? `🔄 Trial (${handbook.trialStatus.trialDaysRemaining}d)`
                              : '⚠️ Trial utgången'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-6">
                        <span className="font-medium">URL:</span>{" "}
                        <p className="text-gray-500 mb-2">
                          handbok.org/{handbook.subdomain}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {(handbook.userRole === 'admin' || handbook.userRole === 'editor') && (
                          <Button 
                            size="sm"
                            asChild
                          >
                            <Link href={`/${handbook.subdomain}`}>
                              {handbook.userRole === 'admin' ? 'Hantera' : 'Redigera'}
                            </Link>
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            window.open(`/${handbook.subdomain}`, '_blank');
                          }}
                        >
                          Visa
                        </Button>
                        {handbook.userRole === 'admin' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteHandbook(handbook.id, handbook.title)}
                            disabled={deletingId === handbook.id}
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 disabled:opacity-50"
                          >
                            {deletingId === handbook.id ? "Raderar..." : "Radera"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                    ))}
                  </div>
                </div>
              )}
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
