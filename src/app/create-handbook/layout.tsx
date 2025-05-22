import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from '@/components/layout/MainLayout';

export default function CreateHandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <MainLayout variant="app" showAuth={false} noWhiteTop={true} showHeader={false}>
        {children}
      </MainLayout>
    </AuthProvider>
  );
}
