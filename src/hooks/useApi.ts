import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { fetchWithAuth } from '@/lib/supabase';
import { useContext } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

/**
 * Custom fetcher function with authentication
 */
async function fetchAPI(url: string) {
  const response = await fetchWithAuth(url);
  
  if (!response.ok) {
    const error = new Error(`API Error: ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }
  
  return response.json();
}

/**
 * Hook for checking superadmin status
 * Only runs for likely admin users to avoid unnecessary API calls
 */
export function useAdminStatus(userId?: string, userEmail?: string) {
  // Only check for users that are likely to be admins
  const shouldCheck = !!(
    userId && 
    userEmail &&
    (userEmail.endsWith('@handbok.org') ||
    // Always check in development
    process.env.NODE_ENV === 'development')
  );

  return useQuery({
    queryKey: queryKeys.user.adminStatus(userId || 'anonymous'),
    queryFn: async () => {
      console.log('🔐 [useAdminStatus] Checking admin status for user:', { userId, userEmail });
      
      try {
        const result = await fetchAPI('/api/auth/check-superadmin');
        console.log('✅ [useAdminStatus] Admin check successful:', result);
        return result;
      } catch (error: any) {
        // Enhanced error logging
        if (error?.status === 401) {
          console.log('🔒 [useAdminStatus] Authentication failed - user not properly logged in');
        } else if (error?.status === 403) {
          console.log('👤 [useAdminStatus] User is not a superadmin (normal)');
        } else {
          console.error('❌ [useAdminStatus] Unexpected error:', error);
        }
        throw error;
      }
    },
    enabled: !!shouldCheck, // Only run for likely admin users
    staleTime: 1000 * 60 * 2, // 2 minutes - admin status changes rarely
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry 401/403 - these are expected for non-admins
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook for checking handbook ownership
 * Cached per handbook-user combination
 */
export function useHandbookOwnership(handbookId?: string, userId?: string) {
  return useQuery({
    queryKey: queryKeys.handbook.ownership(handbookId || '', userId || ''),
    queryFn: () => fetchAPI(`/api/handbook/${handbookId}/ownership?userId=${userId}`),
    enabled: !!(handbookId && userId),
    staleTime: 1000 * 60 * 5, // 5 minutes - ownership changes rarely
    gcTime: 1000 * 60 * 10, // Keep for 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook for handbook trial status
 * Critical for paywall logic - shorter cache time
 */
export function useHandbookTrialStatus(handbookId?: string, userId?: string) {
  return useQuery({
    queryKey: queryKeys.handbook.trialStatus(handbookId || '', userId || ''),
    queryFn: () => fetchAPI(`/api/handbook/${handbookId}/trial-status?userId=${userId}`),
    enabled: !!(handbookId && userId),
    staleTime: 1000 * 60 * 1, // 1 minute - trial status is time-sensitive
    gcTime: 1000 * 60 * 3, // Keep for 3 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 403) return false;
      return failureCount < 3;
    },
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes for active queries
  });
}

/**
 * Hook for fetching user's handbooks
 * Used in dashboard with smart pagination
 */
export function useUserHandbooks(userId?: string) {
  return useQuery({
    queryKey: queryKeys.handbook.list(userId || ''),
    queryFn: () => fetchAPI(`/api/handbooks?userId=${userId}`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 10, // Keep for 10 minutes
  });
}

/**
 * Hook for notification preferences
 * Less critical data - longer cache
 */
export function useNotificationPreferences(handbookId?: string, userId?: string) {
  return useQuery({
    queryKey: queryKeys.notifications.preferences(handbookId || '', userId || ''),
    queryFn: () => fetchAPI(`/api/notifications/preferences?handbook_id=${handbookId}&userId=${userId}`),
    enabled: !!(handbookId && userId),
    staleTime: 1000 * 60 * 10, // 10 minutes - preferences change rarely
    gcTime: 1000 * 60 * 30, // Keep for 30 minutes
    retry: 1, // Only retry once for preferences
  });
}

/**
 * Mutation for updating handbook settings
 * Automatically invalidates related cache entries
 */
export function useUpdateHandbookSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { handbookId: string; settings: any }) => {
      const response = await fetchWithAuth(`/api/handbook/${data.handbookId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.settings),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate handbook-related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.handbook.detail(variables.handbookId),
      });
    },
  });
}

/**
 * Mutation for creating handbooks
 * Invalidates handbook list cache
 */
export function useCreateHandbook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { title: string; userId: string }) => {
      const response = await fetchWithAuth('/api/handbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create handbook: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate user's handbook list
      queryClient.invalidateQueries({
        queryKey: queryKeys.handbook.list(variables.userId),
      });
    },
  });
}

/**
 * Hook for manual cache invalidation
 * Useful for refresh buttons and after external updates
 */
export function useInvalidateCache() {
  const queryClient = useQueryClient();
  
  return {
    invalidateUserData: (userId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.profile(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.adminStatus(userId),
      });
    },
    
    invalidateHandbookData: (handbookId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.handbook.detail(handbookId),
      });
    },
    
    invalidateAllHandbooks: (userId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.handbook.list(userId),
      });
    },
    
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
} 