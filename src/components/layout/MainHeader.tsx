'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from "@/lib/utils";
import { useEffect, useState } from 'react';

interface Section {
  id: string;
  title: string;
}

interface MainHeaderProps {
  variant?: 'landing' | 'app' | 'handbook';
  showAuth?: boolean;
  sections?: Section[];
  navLinks?: { href: string; label: string }[];
  showSidebarTrigger?: boolean;
}

export function MainHeader({ 
  variant = 'landing', 
  showAuth = true, 
  sections, 
  navLinks,
  showSidebarTrigger = false 
}: MainHeaderProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path.startsWith('#')) {
      return pathname === '/landing' || pathname === '/';
    }
    return pathname === path;
  };

  const defaultNavLinks = [
    { href: '#features', label: 'Funktioner' },
    { href: '#pricing', label: 'Pris' },
    { href: '/search', label: 'Hitta förening' },
    { href: '#faq', label: 'Vanliga frågor' },
    { href: '/contact', label: 'Kontakt' }
  ];

  const linksToRender = navLinks || defaultNavLinks;

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b transition-all duration-200 bg-white shadow-sm"
    )} style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-12 items-center">
        
        {/* Sidebar trigger för handbook variant */}
        {showSidebarTrigger && variant === 'handbook' && (
          <div className="mr-3 md:hidden">
            <SidebarTrigger />
          </div>
        )}

        {/* Logo/Brand */}
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="h-5 w-5 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">H</span>
            </div>
            <span className="hidden font-bold sm:inline-block text-blue-600 text-sm">
              Handbok.org
            </span>
          </Link>
        </div>

        {/* Mobile menu för landing/app variants */}
        {variant !== 'handbook' && (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">Växla meny</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
              <SheetHeader>
                <SheetTitle>
                  <Link href="/" className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">H</span>
                    </div>
                    <span className="font-bold text-blue-600">Handbok.org</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                <div className="flex flex-col space-y-3">
                  {linksToRender.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "text-foreground/70 transition-colors hover:text-foreground",
                        isActive(link.href) && "text-foreground font-medium"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop Navigation */}
        {variant === 'landing' && (
          <nav className="hidden md:flex items-center space-x-1">
            {linksToRender.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex h-8 items-center justify-center rounded-md px-3 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                  isActive(link.href) && "bg-accent text-accent-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* App variant sections (fallback för gamla implementationen) */}
        {variant === 'app' && sections && sections.length > 0 && (
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4" />
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
                      className="block py-2 px-3 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Right side - Auth buttons */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search could go here if needed */}
          </div>
          
          {showAuth && (
            <nav className="flex items-center space-x-1">
              {pathname !== '/login' && pathname !== '/signup' && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login" className="text-xs">
                      <User className="mr-1 h-3 w-3" />
                      Logga in
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/create-handbook?new=true" className="text-xs">
                      Skapa handbok
                    </Link>
                  </Button>
                </>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
} 