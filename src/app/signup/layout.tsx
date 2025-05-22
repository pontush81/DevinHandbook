import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from '@/components/layout/MainLayout';

export default function SignupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <MainLayout variant="landing" showAuth={false} noWhiteTop={true} showHeader={false}>
        {children}
      </MainLayout>
    </AuthProvider>
  );
} 