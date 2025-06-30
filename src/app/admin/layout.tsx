"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { checkIsSuperAdminClient } from "@/lib/user-utils";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  BookOpen, 
  Users, 
  FileText, 
  BarChart3, 
  Home,
  LogOut,
  Menu,
  X,
  Database,
  UserCheck,
  ExternalLink
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Dynamisk Stripe URL baserat på miljö
const getStripeProductsUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
  const forceTestMode = process.env.FORCE_STRIPE_TEST_MODE === 'true';
  
  // Använd test-miljö om vi inte är i produktion eller om testläge är påtvingat
  const useTestMode = !isProduction || forceTestMode;
  
  return useTestMode 
    ? 'https://dashboard.stripe.com/test/products'
    : 'https://dashboard.stripe.com/products';
};

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/handbooks', label: 'Handböcker', icon: BookOpen },
  { href: '/admin/users', label: 'Användare', icon: UserCheck },
  { href: '/admin/customers', label: 'Kunder', icon: Users },
  { href: '/admin/content', label: 'Innehåll', icon: FileText },
  { href: '/admin/analytics', label: 'Statistik', icon: BarChart3 },
  { 
    href: getStripeProductsUrl(), 
    label: `Priser (Stripe ${process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production' && process.env.FORCE_STRIPE_TEST_MODE !== 'true' ? 'Live' : 'Test'})`, 
    icon: ExternalLink, 
    external: true 
  },
  { href: '/admin/backup', label: 'Backup', icon: Database },
  { href: '/admin/settings', label: 'Inställningar', icon: Settings },
];

function AdminLayoutInner({ children }: AdminLayoutProps) {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading) {
        if (!user) {
          router.push("/login");
          return;
        }

        try {
          // Använd den nya säkra funktionen för att kontrollera superadmin-status
          const isSuperAdminResult = await checkIsSuperAdminClient(user.id);

          if (isSuperAdminResult) {
            setIsSuperAdmin(true);
          } else {
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("Error checking superadmin status:", error);
          router.push("/dashboard");
        } finally {
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuth();
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href && !item.external;
              
              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                );
              }
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <Separator />

          {/* Footer */}
          <div className="p-4">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logga ut
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthProvider>
  );
} 