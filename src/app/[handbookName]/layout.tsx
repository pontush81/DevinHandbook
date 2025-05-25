import React from "react";
import { Metadata } from 'next';
import { AuthProvider } from "@/contexts/AuthContext";

export const dynamic = 'force-dynamic';

export default function HandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Handbok - Bostadsrättsförening',
    description: 'Digital handbok för bostadsrättsförening',
  };
} 