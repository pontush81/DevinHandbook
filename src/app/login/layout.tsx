import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from '@/components/layout/MainLayout';

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <MainLayout variant="landing" showAuth={false}>
        {children}
      </MainLayout>
    </AuthProvider>
  );
} 