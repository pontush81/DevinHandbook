import React from "react";
import { Metadata } from 'next';
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { headers } from 'next/headers';

// Force dynamic rendering and disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientErrorBoundary>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ClientErrorBoundary>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Handbok - Bostadsrättsförening',
    description: 'Digital handbok för bostadsrättsförening',
  };
} 