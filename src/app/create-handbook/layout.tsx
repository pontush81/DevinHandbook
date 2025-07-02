import React from "react";
import { MainLayout } from '@/components/layout/MainLayout';

export default function CreateHandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout variant="app" showAuth={false} noWhiteTop={true} showHeader={false}>
      {children}
    </MainLayout>
  );
}
