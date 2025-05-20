import React from "react";
import HandbookHeaderClient from '@/components/HandbookHeaderClient';
import { AuthProvider } from "@/contexts/AuthContext";

export default function CreateHandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <HandbookHeaderClient />
        <main>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
