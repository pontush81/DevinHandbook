"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { HandbooksTable } from "./HandbooksTable";
import { UsersTable } from "./UsersTable";
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Users, 
  FileText, 
  TrendingUp,
  Plus,
  Edit,
  Eye
} from "lucide-react";
import Link from "next/link";

interface Handbook {
  id: string;
  name: string;
  subdomain: string;
  created_at: string;
  published: boolean;
  owner_id: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface DashboardStats {
  totalHandbooks: number;
  publishedHandbooks: number;
  totalUsers: number;
  totalPages: number;
}

export default function AdminDashboardPage() {
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalHandbooks: 0,
    publishedHandbooks: 0,
    totalUsers: 0,
    totalPages: 0
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'handbooks' | 'users'>('overview');

  const fetchData = async () => {
    try {
      setIsLoadingData(true);
      
      // Fetch handbooks
      const { data: handbooksData, error: handbooksError } = await supabase
        .from("handbooks")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (handbooksError) throw handbooksError;
      
      setHandbooks(handbooksData || []);
      
      // Fetch users
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

      // Calculate stats
      const totalHandbooks = handbooksData?.length || 0;
      const publishedHandbooks = handbooksData?.filter(h => h.published).length || 0;
      const totalUsers = usersData?.length || 0;

      // Fetch total pages count
      const { count: pagesCount } = await supabase
        .from("pages")
        .select("*", { count: 'exact', head: true });

      setStats({
        totalHandbooks,
        publishedHandbooks,
        totalUsers,
        totalPages: pagesCount || 0
      });

    } catch (err: unknown) {
      console.error("Error fetching data:", err);
      setError("Kunde inte hämta data. Kontrollera att du har superadmin-behörighet.");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const recentHandbooks = handbooks.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Hantera handböcker, användare och innehåll</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/create-handbook">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ny handbok
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="handbooks">Handböcker</TabsTrigger>
          <TabsTrigger value="users">Användare</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totalt handböcker</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalHandbooks}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.publishedHandbooks} publicerade
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Användare</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Registrerade användare
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sidor</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPages}</div>
                <p className="text-xs text-muted-foreground">
                  Totalt antal sidor
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktivitet</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((stats.publishedHandbooks / Math.max(stats.totalHandbooks, 1)) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Publiceringsgrad
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Handbooks */}
          <Card>
            <CardHeader>
              <CardTitle>Senaste handböcker</CardTitle>
              <CardDescription>
                De 5 senast skapade handböckerna
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : recentHandbooks.length > 0 ? (
                <div className="space-y-4">
                  {recentHandbooks.map((handbook) => (
                    <div key={handbook.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <BookOpen className="h-8 w-8 text-gray-400" />
                        <div>
                          <h3 className="font-medium">{handbook.name}</h3>
                          <p className="text-sm text-gray-500">
                            {handbook.subdomain}.handbok.org
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={handbook.published ? "default" : "secondary"}>
                          {handbook.published ? "Publicerad" : "Utkast"}
                        </Badge>
                        <div className="flex space-x-2">
                          <Link href={`/${handbook.subdomain}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/${handbook.subdomain}`} target="_blank">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Inga handböcker skapade än</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
  );
}
