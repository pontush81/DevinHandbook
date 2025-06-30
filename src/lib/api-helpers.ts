/**
 * API-hjälpfunktioner för robust autentisering
 */

/**
 * API helpers with intelligent caching for handbook-related endpoints
 * This prevents API spam and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId?: string;
}

// Cache storage
const apiCache = new Map<string, CacheEntry<any>>();

// Cache durations (in milliseconds)
const CACHE_DURATIONS = {
  trial_status: 60000,    // 1 minute for trial status
  ownership: 300000,      // 5 minutes for ownership (changes rarely)
  admin_check: 30000,     // 30 seconds for admin checks
} as const;

/**
 * Get cache key for API endpoint
 */
function getCacheKey(endpoint: string, params: Record<string, string>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `${endpoint}?${sortedParams}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid<T>(entry: CacheEntry<T>, maxAge: number, currentUserId?: string): boolean {
  const now = Date.now();
  const isWithinTimeLimit = (now - entry.timestamp) < maxAge;
  
  // If there's a user context, ensure cache is for same user
  if (currentUserId && entry.userId && entry.userId !== currentUserId) {
    return false;
  }
  
  return isWithinTimeLimit;
}

/**
 * Cached fetch with automatic Bearer token authentication
 */
export async function cachedFetch<T>(
  endpoint: string, 
  params: Record<string, string> = {},
  cacheDuration: number = 60000,
  userId?: string
): Promise<T> {
  const cacheKey = getCacheKey(endpoint, params);
  
  // Check cache first
  const cachedEntry = apiCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry, cacheDuration, userId)) {
    return cachedEntry.data as T;
  }
  
  // Build URL with params
  const url = new URL(endpoint, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  // Try standard fetch first
  let response = await fetch(url.toString());
  
  // If unauthorized, try with Bearer token
  if (!response.ok && response.status === 401) {
    try {
      const { getSupabaseClient } = await import('@/lib/supabase-client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (tokenError) {
      // Ignore token errors - fall through to handle response
    }
  }
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Cache the result
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    userId
  });
  
  return data as T;
}

/**
 * Get handbook trial status with caching
 */
export async function getCachedTrialStatus(
  handbookId: string, 
  userId: string
): Promise<any> {
  return cachedFetch(
    `/api/handbook/${handbookId}/trial-status`,
    { userId },
    CACHE_DURATIONS.trial_status,
    userId
  );
}

/**
 * Get handbook ownership with caching
 */
export async function getCachedOwnership(
  handbookId: string, 
  userId: string
): Promise<{ isOwner: boolean; handbookId: string; userId: string; ownerId: string }> {
  return cachedFetch(
    `/api/handbook/${handbookId}/ownership`,
    { userId },
    CACHE_DURATIONS.ownership,
    userId
  );
}

/**
 * Clear cache for specific user (call on logout/user change)
 */
export function clearUserCache(userId?: string): void {
  if (userId) {
    // Clear only entries for specific user
    for (const [key, entry] of apiCache.entries()) {
      if (entry.userId === userId) {
        apiCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    apiCache.clear();
  }
}

/**
 * Clear cache for specific endpoint pattern
 */
export function clearEndpointCache(endpointPattern: string): void {
  for (const key of apiCache.keys()) {
    if (key.includes(endpointPattern)) {
      apiCache.delete(key);
    }
  }
}

/**
 * Create authenticated headers helper
 */
export async function createAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { getSupabaseClient } = await import('@/lib/supabase-client');
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
    }
  } catch (error) {
    // Fall back to no auth headers
  }
  
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * Authenticated fetch helper
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await createAuthHeaders();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers
    }
  });
  
  return response;
} 