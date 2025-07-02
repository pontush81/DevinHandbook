import { MainLayout } from '@/components/layout/MainLayout';
import SessionResetNotice from '@/components/SessionResetNotice';
import { DashboardNav } from '@/components/dashboard/DashboardNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout variant="app" showAuth={false} noWhiteTop={true} showHeader={false}>
      <DashboardNav />
      <div className="container px-4 mx-auto mt-4">
        <SessionResetNotice />
      </div>
      {children}
    </MainLayout>
  );
} 