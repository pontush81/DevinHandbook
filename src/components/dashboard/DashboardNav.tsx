'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStatus } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  Calendar,
  Building,
  ChevronDown,
  Shield,
  Book,
  BarChart3,
  Users,
  CreditCard,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

// Client-side only wrapper to prevent SSR issues
function DashboardNavContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure we only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Always call the hook, but let it handle the conditional logic internally
  const adminStatus = useAdminStatus(
    mounted ? user?.id : undefined, 
    mounted ? user?.email : undefined
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { icon: Book, label: 'Handböcker', href: '/dashboard' },
    { icon: Calendar, label: 'Bokningar', href: '/dashboard/bookings' },
    { icon: Building, label: 'Föreningar', href: '/dashboard/organizations' },
    { icon: BarChart3, label: 'Statistik', href: '/dashboard/analytics' },
    { icon: Users, label: 'Medlemmar', href: '/dashboard/members' },
    { icon: CreditCard, label: 'Fakturering', href: '/dashboard/billing' },
    { icon: Settings, label: 'Inställningar', href: '/dashboard/settings' },
  ];

  // Show loading state or basic navigation if not mounted yet
  if (!mounted) {
    return (
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Book className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
              <Book className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Dashboard</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.slice(0, 4).map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => router.push(item.href)}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Notification Bell */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
              3
            </Badge>
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {user?.email?.split('@')[0] || 'Användare'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.email?.split('@')[0] || 'Användare'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'användare@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Admin Badge */}
              {adminStatus.data?.isSuperAdmin && (
                <>
                  <DropdownMenuItem className="cursor-default">
                    <Shield className="mr-2 h-4 w-4 text-blue-600" />
                    <span className="text-blue-600 font-medium">Superadmin</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Inställningar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/help')}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Hjälp</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logga ut</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => {
                  router.push(item.href);
                  setIsMenuOpen(false);
                }}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

// Main export with client-side only rendering
export function DashboardNav() {
  return <DashboardNavContent />;
} 