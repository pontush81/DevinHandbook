import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from '@/components/layout/MainLayout';

const adminNavLinks = [
  { href: '/admin', label: 'Admin' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/logout', label: 'Logga ut' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MainLayout variant="app" showAuth={false} navLinks={adminNavLinks}>
        {children}
      </MainLayout>
    </AuthProvider>
  );
} 