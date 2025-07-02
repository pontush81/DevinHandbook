import { ReactNode } from "react";
import { MainLayout } from '@/components/layout/MainLayout';

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return (
    <MainLayout variant="landing" showAuth={false} noWhiteTop={true} showHeader={false}>
      {children}
    </MainLayout>
  );
} 