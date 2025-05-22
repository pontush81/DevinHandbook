import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from '@/components/layout/MainLayout';
import { SessionResetNotice } from '@/components/SessionResetNotice';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MainLayout variant="app" showAuth={false} noWhiteTop={true} showHeader={false}>
        <div className="container px-4 mx-auto mt-4">
          <SessionResetNotice />
        </div>
        {children}
      </MainLayout>
    </AuthProvider>
  );
} 