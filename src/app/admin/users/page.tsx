"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { UsersTable } from "../UsersTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface User {
  id: string;
  email: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, created_at");
      
      if (usersError) {
        // Fallback to API if direct access fails
        const response = await fetch('/api/admin/users');
        const authUsers = await response.json();
        setUsers(authUsers || []);
      } else {
        setUsers(usersData || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Kunde inte hämta användare");
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
          <CardTitle>Alla användare</CardTitle>
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