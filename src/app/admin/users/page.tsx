"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { UsersTable } from "../UsersTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Handbook {
  id: string;
  title: string;
  subdomain?: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  app_metadata?: {
    is_superadmin?: boolean;
  };
  handbooks?: Handbook[];
  handbook_count?: number;
  is_superadmin?: boolean;
  is_handbook_admin?: boolean;
  is_handbook_editor?: boolean;
  is_handbook_viewer?: boolean;
  roles?: string[];
  primary_role?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      console.log('[Users Page] Fetching users...');
      setIsLoading(true);
      setError(null);
      
      // Rensa användarlistan först för att tvinga re-render
      setUsers([]);
      
      // Lägg till cache-busting för att säkerställa att vi får färsk data
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/admin/users?t=${timestamp}`);
      console.log('[Users Page] API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const apiResult = await response.json();
      console.log('[Users Page] API result:', apiResult);
      
      if (apiResult.error) {
        throw new Error(apiResult.error);
      }
      
      // API returns { data: users[] }, so we need to access the data property
      const authUsers = apiResult.data || [];
      console.log('[Users Page] Setting users:', authUsers.length, 'users found');
      console.log('[Users Page] User emails:', authUsers.map(u => u.email));
      console.log('[Users Page] Superadmin status:', authUsers.map(u => ({ email: u.email, is_superadmin: u.is_superadmin })));
      setUsers(Array.isArray(authUsers) ? authUsers : []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "Kunde inte hämta användare");
      setUsers([]); // Ensure users is always an array even on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Användare</h1>
          <p className="text-gray-500 mt-1">Hantera alla användare i systemet</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alla användare ({users.length})</CardTitle>
          <CardDescription>
            Översikt över alla registrerade användare
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : (
            <UsersTable users={users} onDataChange={fetchUsers} />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 