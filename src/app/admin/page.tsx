"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { HandbooksTable } from "./HandbooksTable";
import { UsersTable } from "./UsersTable";

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
    } catch (err: unknown) {
      console.error("Error fetching data:", err);
      setError("Kunde inte hämta data. Kontrollera att du har admin-behörighet.");
    } finally {
      setIsLoadingData(false);
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
            <HandbooksTable handbooks={handbooks} onDataChange={fetchData} />
          ) : (
            <UsersTable users={users} onDataChange={fetchData} />
          )}
        </div>
      </main>
    </div>
  );
}
