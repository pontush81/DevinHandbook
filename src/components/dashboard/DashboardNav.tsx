"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Book, Settings, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { checkIsSuperAdmin } from "@/lib/user-utils";

export function DashboardNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const isAdmin = await checkIsSuperAdmin(
          supabase,
          user.id,
          user.email || ""
        );
        setIsSuperAdmin(isAdmin);
      } catch (error) {
        console.error("Fel vid kontroll av admin-status:", error);
      }
    };

    checkAdminStatus();
  }, [user]);

  return (
    <nav className="bg-white shadow-sm py-4 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-lg font-medium">
              Dashboard
            </Link>
            
            {isSuperAdmin && (
              <Link
                href="/admin"
                className={`flex items-center space-x-1 text-sm ${
                  pathname === "/admin" ? "text-blue-600 font-medium" : "text-gray-600"
                }`}
              >
                <Users size={16} />
                <span>Admin</span>
              </Link>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {user?.email}
            </div>
            
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-red-600"
            >
              <LogOut size={16} />
              <span>Logga ut</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 