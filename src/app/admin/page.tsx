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
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registered' | 'handbook_created' | 'handbook_published';
  user_email?: string;
  handbook_name?: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalHandbooks: 0,
    publishedHandbooks: 0,
    totalUsers: 0,
    totalPages: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'handbooks' | 'users'>('overview');
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

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
      
      // Fetch users with detailed time filtering
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

      // Calculate detailed stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const allUsers = usersData || [];
      const newUsersToday = allUsers.filter(u => new Date(u.created_at) >= today).length;
      const newUsersThisWeek = allUsers.filter(u => new Date(u.created_at) >= weekAgo).length;
      const newUsersThisMonth = allUsers.filter(u => new Date(u.created_at) >= monthAgo).length;

      const totalHandbooks = handbooksData?.length || 0;
      const publishedHandbooks = handbooksData?.filter(h => h.published).length || 0;
      const totalUsers = allUsers.length;

      // Fetch total pages count
      const { count: pagesCount } = await supabase
        .from("pages")
        .select("*", { count: 'exact', head: true });

      setStats({
        totalHandbooks,
        publishedHandbooks,
        totalUsers,
        totalPages: pagesCount || 0,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth
      });

      // Create recent activities feed
      const activities: RecentActivity[] = [];
      
      // Add recent user registrations
      allUsers.slice(0, 5).forEach(user => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user_registered',
          user_email: user.email,
          created_at: user.created_at
        });
      });
      
      // Add recent handbook creations
      (handbooksData || []).slice(0, 5).forEach(handbook => {
        activities.push({
          id: `handbook-${handbook.id}`,
          type: 'handbook_created',
          handbook_name: handbook.name,
          created_at: handbook.created_at
        });
        
        if (handbook.published) {
          activities.push({
            id: `published-${handbook.id}`,
            type: 'handbook_published',
            handbook_name: handbook.name,
            created_at: handbook.updated_at || handbook.created_at
          });
        }
      });
      
      // Sort activities by date and take latest 10
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivities(activities.slice(0, 10));

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
                <CardTitle className="text-sm font-medium">Totalt användare</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.newUsersThisMonth} nya denna månaden
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nya användare idag</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.newUsersToday}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.newUsersThisWeek} denna veckan
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
          </div>

          {/* Aktivitets-timeline och senaste handböcker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle>Senaste aktiviteter</CardTitle>
                <CardDescription>
                  Översikt över senaste användaraktiviteter
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                        <div className="flex-shrink-0">
                          {activity.type === 'user_registered' && (
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                          {activity.type === 'handbook_created' && (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                          {activity.type === 'handbook_published' && (
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <Eye className="h-4 w-4 text-purple-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.type === 'user_registered' && `Ny användare: ${activity.user_email}`}
                            {activity.type === 'handbook_created' && `Handbok skapad: ${activity.handbook_name}`}
                            {activity.type === 'handbook_published' && `Handbok publicerad: ${activity.handbook_name}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.created_at).toLocaleString('sv-SE')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Ingen aktivitet att visa</p>
                )}
              </CardContent>
            </Card>

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
          </div>
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
