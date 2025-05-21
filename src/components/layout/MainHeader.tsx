'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Section {
  id: string;
  title: string;
}

interface MainHeaderProps {
  variant?: 'landing' | 'app';
  showAuth?: boolean;
  sections?: Section[];
  navLinks?: { href: string; label: string }[];
}

export function MainHeader({ variant = 'landing', showAuth = true, sections, navLinks }: MainHeaderProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path.startsWith('#')) {
      return pathname === '/landing' || pathname === '/';
    }
    return pathname === path;
  };

  const defaultNavLinks = [
    { href: '#features', label: 'Funktioner' },
    { href: '#pricing', label: 'Pris' },
    { href: '#faq', label: 'Vanliga frågor' },
    { href: '/contact', label: 'Kontakt' }
  ];

  const linksToRender = navLinks || defaultNavLinks;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link 
            href="/landing" 
            className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            aria-label="Handbok.org startsida"
          >
            Handbok.org
          </Link>
        </div>

        {variant === 'landing' && (
          <nav className="hidden md:flex space-x-8" aria-label="Huvudnavigation">
            {linksToRender.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-gray-700 hover:text-blue-600 transition-colors ${
                  isActive(link.href) ? 'text-blue-600 font-medium' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Mobilmeny för app-variant */}
        {variant === 'app' && sections && sections.length > 0 && (
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Öppna meny</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Innehåll</SheetTitle>
                </SheetHeader>
                <nav className="mt-8">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#section-${section.id}`}
                      className="block py-2 px-3 text-base font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        )}

        <div className="flex items-center space-x-4">
          {showAuth && (
            <Button asChild variant="default">
              <Link href="/create-handbook">
                Skapa handbok
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
} 