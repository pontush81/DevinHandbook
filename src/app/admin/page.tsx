"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { HandbooksTable } from "./HandbooksTable";
import { UsersTable } from "./UsersTable";
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'handbooks' | 'users'>('handbooks');
  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(false);

  useEffect(() => {
    const checkSuperadmin = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("is_superadmin")
        .eq("id", user.id)
        .single();
      
      if (!error && data && data.is_superadmin) {
        setIsSuperadmin(true);
      } else {
        router.push("/dashboard");
      }
    };

    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else {
        checkSuperadmin();
      }
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      setIsLoadingData(true);
      
      if (!isSuperadmin) return;
      
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
      setError("Kunde inte hämta data. Kontrollera att du har superadmin-behörighet.");
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full border-b">
            <TabsTrigger value="handbooks" className="flex-1">Alla handböcker</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">Användare</TabsTrigger>
          </TabsList>
          <TabsContent value="handbooks">
            {isLoadingData ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : (
              <HandbooksTable handbooks={handbooks} onDataChange={fetchData} />
            )}
          </TabsContent>
          <TabsContent value="users">
            {isLoadingData ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : (
              <UsersTable users={users} onDataChange={fetchData} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
