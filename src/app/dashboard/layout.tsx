import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from '@/components/layout/MainLayout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MainLayout variant="app" showAuth={false}>
        {children}
      </MainLayout>
    </AuthProvider>
  );
} 