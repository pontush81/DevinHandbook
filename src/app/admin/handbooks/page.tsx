"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { HandbooksTable } from "../HandbooksTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

interface Handbook {
  id: string;
  name: string;
  subdomain: string;
  created_at: string;
  published: boolean;
  owner_id: string;
}

export default function HandbooksPage() {
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHandbooks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("handbooks")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setHandbooks(data || []);
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