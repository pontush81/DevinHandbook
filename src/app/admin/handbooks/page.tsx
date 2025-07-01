"use client";

import React, { useEffect, useState } from "react";
import { HandbooksTable } from "../HandbooksTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Handbook {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  published: boolean;
  owner_id: string;
  organization_name?: string;
}

export default function HandbooksPage() {
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHandbooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Helper function to create auth headers
      const createAuthHeaders = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            return {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            };
          }
        } catch {}
        return { 'Content-Type': 'application/json' };
      };
      
      let response = await fetch('/api/admin/handbooks');
      
      // If unauthorized, try with auth header
      if (!response.ok && response.status === 401) {
        console.log('[Handbooks Page] Got 401, retrying with auth headers...');
        const headers = await createAuthHeaders();
        response = await fetch('/api/admin/handbooks', { headers });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setHandbooks(result.data);
      } else {
        throw new Error(result.message || 'Oväntat API-svar');
      }
    } catch (err) {
      console.error("Error fetching handbooks:", err);
      setError("Kunde inte hämta handböcker");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHandbooks();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Handböcker</h1>
          <p className="text-gray-500 mt-1">Hantera alla handböcker i systemet</p>
        </div>
        <Link href="/create-handbook">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ny handbok
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alla handböcker</CardTitle>
          <CardDescription>
            Översikt över alla handböcker i systemet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : (
            <HandbooksTable handbooks={handbooks} onDataChange={fetchHandbooks} />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 