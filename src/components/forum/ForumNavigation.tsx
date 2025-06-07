/**
 * Forum-navigation för integration i huvudmenyn
 * Använder path-baserad routing: /[subdomain]/forum
 */
import { MessageCircle, TrendingUp, Clock, Flag } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ForumNavigationProps {
  subdomain: string;
  currentPath?: string;
  unreadCount?: number;
  isAdmin?: boolean;
}

export function ForumNavigation({ 
  subdomain, 
  currentPath, 
  unreadCount = 0,
  isAdmin = false 
}: ForumNavigationProps) {
  const baseUrl = `/${subdomain}/forum`;
  
  const navigationItems = [
    {
      name: 'Forum',
      href: baseUrl,
      icon: MessageCircle,
      description: 'Diskussioner och meddelanden'
    },
    {
      name: 'Senaste aktivitet',
      href: `${baseUrl}/recent`,
      icon: Clock,
      description: 'Senaste inlägg och trådar'
    },
    {
      name: 'Populärt',
      href: `${baseUrl}/popular`,
      icon: TrendingUp,
      description: 'Mest diskuterade ämnen'
    }
  ];

  // Lägg till admin-verktyg om användaren är admin
  if (isAdmin) {
    navigationItems.push({
      name: 'Moderation',
      href: `${baseUrl}/admin`,
      icon: Flag,
      description: 'Moderationsverktyg och statistik'
    });
  }

  return (
    <div className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.href;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              'hover:bg-gray-100 hover:text-gray-900',
              isActive 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                : 'text-gray-600'
            )}
          >
            <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{item.name}</span>
            
            {/* Visa antal olästa notifikationer för forum */}
            {item.name === 'Forum' && unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Kompakt forum-knapp för huvudnavigeringen
 * Integreras i befintlig sidemeny
 */
export function ForumMenuButton({ 
  subdomain, 
  unreadCount = 0 
}: { 
  subdomain: string; 
  unreadCount?: number; 
}) {
  return (
    <Link
      href={`/${subdomain}/forum`}
      className={cn(
        'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
        'hover:bg-gray-100 hover:text-gray-900 text-gray-600'
      )}
    >
      <MessageCircle className="mr-3 h-5 w-5" />
      <span>Forum</span>
      {unreadCount > 0 && (
        <span className="ml-auto bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
} 