import { QueryClient } from '@tanstack/react-query';

/**
 * Professional QueryClient configuration
 * Optimized for SaaS applications with user-specific data
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Retry failed requests 3 times with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 401, 403, 404 - these are expected errors
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
      // Don't refetch on window focus for better UX
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect unless data is stale
      refetchOnReconnect: 'always',
      // Network mode for offline handling
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Network mode for offline handling
      networkMode: 'online',
    },
  },
});

/**
 * Query keys factory for consistent cache invalidation
 */
export const queryKeys = {
  // User-related queries
  user: {
    profile: (userId: string) => ['user', 'profile', userId] as const,
    adminStatus: (userId: string) => ['user', 'admin-status', userId] as const,
  },
  
  // Handbook-related queries  
  handbook: {
    all: ['handbook'] as const,
    lists: () => [...queryKeys.handbook.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.handbook.lists(), userId] as const,
    details: () => [...queryKeys.handbook.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.handbook.details(), id] as const,
    ownership: (handbookId: string, userId: string) => 
      [...queryKeys.handbook.detail(handbookId), 'ownership', userId] as const,
    trialStatus: (handbookId: string, userId: string) => 
      [...queryKeys.handbook.detail(handbookId), 'trial-status', userId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    preferences: (handbookId: string, userId: string) => 
      [...queryKeys.notifications.all, 'preferences', handbookId, userId] as const,
  },
} as const; 