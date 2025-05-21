'use client';

import { MainHeader } from './MainHeader';
import { MainFooter } from './MainFooter';

interface Section {
  id: string;
  title: string;
}

interface MainLayoutProps {
  children: React.ReactNode;
  variant?: 'landing' | 'app';
  showAuth?: boolean;
  sections?: Section[];
  navLinks?: { href: string; label: string }[];
}

export function MainLayout({ children, variant = 'landing', showAuth = true, sections, navLinks }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader variant={variant} showAuth={showAuth} sections={sections} navLinks={navLinks} />
      <main className="flex-1">
        {children}
      </main>
      <MainFooter variant={variant} />
    </div>
  );
} 