"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Calendar,
  Mail,
  Clock,
  BarChart3,
  RefreshCw
} from "lucide-react";

interface UserStats {
  totalUsers: number;
  confirmedUsers: number;
  confirmationRate: number;
  usersToday: number;
  usersYesterday: number;
  usersThisWeek: number;
  usersThisMonth: number;
  usersThisYear: number;
  growthToday: number;
  monthlyStats: Array<{
    month: string;
    users: number;
    confirmed: number;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    created_at: string;
    confirmed: boolean;
  }>;
}

export default function CustomersPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/user-stats');
      if (!response.ok) {
        throw new Error('Kunde inte hämta användarstatistik');
      }
      
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Fel vid hämtning av användarstatistik:', err);
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <span>❌</span>
              <span>{error}</span>
            </div>
            <Button onClick={fetchStats} className="mt-4" variant="outline">
              Försök igen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kunder & Användare</h1>
          <p className="text-gray-500 mt-1">Detaljerad översikt över användarregistreringar</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Senast uppdaterad: {lastUpdated.toLocaleString('sv-SE')}
            </p>
          )}
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Uppdatera
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt användare</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmationRate}% bekräftade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nya idag</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.usersToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.growthToday > 0 ? '+' : ''}{stats.growthToday}% vs igår
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denna vecka</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usersThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {stats.usersThisMonth} denna månaden
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">E-postbekräftelse</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmedUsers}</div>
            <p className="text-xs text-muted-foreground">
              av {stats.totalUsers} användare
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Månadsvis tillväxt</CardTitle>
            <CardDescription>
              Nya användare de senaste 12 månaderna
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.monthlyStats.slice(-6).map((month) => (
                <div key={month.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{month.month}</div>
                    <div className="text-sm text-gray-500">
                      {month.confirmed} av {month.users} bekräftade
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{month.users}</div>
                    <div className="text-xs text-gray-500">
                      {month.users > 0 ? Math.round((month.confirmed / month.users) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Senaste registreringar</CardTitle>
            <CardDescription>
              De 10 senast registrerade användarna
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {user.confirmed ? (
                        <UserCheck className="h-5 w-5 text-green-600" />
                      ) : (
                        <Mail className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{user.email}</div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(user.created_at).toLocaleString('sv-SE')}
                      </div>
                    </div>
                  </div>
                  <Badge variant={user.confirmed ? "default" : "secondary"}>
                    {user.confirmed ? "Bekräftad" : "Väntar"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Tillväxttakt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.usersThisMonth > 0 ? '+' : ''}{stats.usersThisMonth}
            </div>
            <p className="text-blue-700 text-sm">Nya användare denna månad</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900">Bekräftelsegrad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.confirmationRate}%
            </div>
            <p className="text-green-700 text-sm">Av alla registrerade användare</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900">Denna år</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats.usersThisYear}
            </div>
            <p className="text-purple-700 text-sm">Totala registreringar {new Date().getFullYear()}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 