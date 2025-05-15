"use client";

import React, { useEffect, useState } from "react";
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
  user_id: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const { user, isLoading, hasRole } = useAuth();
  const router = useRouter();
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'handbooks' | 'users'>('handbooks');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (!hasRole("admin")) {
        router.push("/dashboard");
      } else {
        fetchData();
      }
    }
  }, [user, isLoading, router, hasRole]);

  const fetchData = async () => {
    try {
      setIsLoadingData(true);
      
      const { data: handbooksData, error: handbooksError } = await supabase
        .from("handbooks")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (handbooksError) throw handbooksError;
      
      setHandbooks(handbooksData || []);
      
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, created_at");
      
      if (usersError) {
        const { data: authUsers, error: authError } = await fetch('/api/admin/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }).then(res => res.json());
        
        if (authError) throw authError;
        
        setUsers(authUsers || []);
      } else {
        setUsers(usersData || []);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("Kunde inte hämta data. Kontrollera att du har admin-behörighet.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const setUserAsAdmin = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/set-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      const { error } = await response.json();
      
      if (error) throw new Error(error);
      
      fetchData();
    } catch (err: any) {
      console.error("Error setting user as admin:", err);
      setError(err.message || "Kunde inte uppdatera användarroll");
    }
  };
  
  const revalidateHandbook = async (subdomain: string) => {
    try {
      setIsProcessing(subdomain);
      setError(null);
      
      const response = await fetch('/api/admin/revalidate-handbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subdomain }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Kunde inte uppdatera cache');
      }
      
      setError(`Cache för ${subdomain}.handbok.org har uppdaterats`);
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
      console.error("Error revalidating handbook:", err);
      setError(err.message || "Kunde inte uppdatera cache");
    } finally {
      setIsProcessing(null);
    }
  };
  
  const toggleHandbookPublished = async (id: string, published: boolean) => {
    try {
      setIsProcessing(id);
      setError(null);
      
      const response = await fetch('/api/admin/toggle-handbook-published', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, published }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Kunde inte ändra publiceringstatus');
      }
      
      fetchData();
    } catch (err: any) {
      console.error("Error toggling handbook published status:", err);
      setError(err.message || "Kunde inte ändra publiceringstatus");
    } finally {
      setIsProcessing(null);
    }
  };

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
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">
              Dashboard
            </Link>
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
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('handbooks')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'handbooks'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Alla handböcker
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'users'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Användare
              </button>
            </nav>
          </div>

          {isLoadingData ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : activeTab === 'handbooks' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Namn
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subdomän
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skapad
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ägare
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {handbooks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        Inga handböcker hittades
                      </td>
                    </tr>
                  ) : (
                    handbooks.map((handbook) => (
                      <tr key={handbook.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {handbook.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {handbook.subdomain}.handbok.org
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(handbook.created_at).toLocaleDateString("sv-SE")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              handbook.published
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {handbook.published ? "Publicerad" : "Utkast"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {handbook.user_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <a
                              href={`https://${handbook.subdomain}.handbok.org`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-black hover:underline"
                            >
                              Visa
                            </a>
                            <Link
                              href={`/edit-handbook/${handbook.id}`}
                              className="text-black hover:underline"
                            >
                              Redigera
                            </Link>
                            <button
                              onClick={() => revalidateHandbook(handbook.subdomain)}
                              disabled={isProcessing === handbook.subdomain}
                              className="text-black hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessing === handbook.subdomain ? 'Uppdaterar...' : 'Uppdatera cache'}
                            </button>
                            <button
                              onClick={() => toggleHandbookPublished(handbook.id, !handbook.published)}
                              disabled={isProcessing === handbook.id}
                              className={`${handbook.published ? 'text-red-600' : 'text-green-600'} hover:underline disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {isProcessing === handbook.id 
                                ? (handbook.published ? 'Avpublicerar...' : 'Publicerar...') 
                                : (handbook.published ? 'Avpublicera' : 'Publicera')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      E-post
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registrerad
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        Inga användare hittades
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString("sv-SE")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setUserAsAdmin(user.id)}
                            className="text-black hover:underline"
                          >
                            Gör till admin
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
