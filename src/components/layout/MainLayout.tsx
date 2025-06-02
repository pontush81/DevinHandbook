'use client';

import { MainHeader } from './MainHeader';
import { MainFooter } from './MainFooter';

interface Section {
  id: string;
  title: string;
}

interface MainLayoutProps {
  children: React.ReactNode;
  variant?: 'landing' | 'app' | 'handbook';
  showAuth?: boolean;
  showHeader?: boolean;
  noWhiteTop?: boolean;
  sections?: Section[];
  navLinks?: { href: string; label: string }[];
}

export function MainLayout({ 
  children, 
  variant = 'landing', 
  showAuth = true, 
  showHeader = true,
  noWhiteTop = false,
  sections, 
  navLinks 
}: MainLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${noWhiteTop ? 'bg-gray-50' : ''}`}>
      {showHeader && (
        <MainHeader variant={variant} showAuth={showAuth} sections={sections} navLinks={navLinks} />
      )}
      <main className="flex-1">
        {children}
      </main>
      {variant !== 'handbook' && <MainFooter variant={variant} />}
    </div>
  );
} 