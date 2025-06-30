/**
 * API-hjälpfunktioner för robust autentisering
 */

/**
 * Skapar headers med automatisk Authorization token om tillgänglig
 */
export async function createAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  try {
    // Kontrollera om vi är på klientsidan
    if (typeof window !== 'undefined') {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }
  } catch (error) {
    // Tyst felhantering - fortsätt utan Authorization header
    console.log('Could not get auth token:', error);
  }
  
  return headers;
}

/**
 * Gör en autentiserad fetch-request med automatiska headers
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await createAuthHeaders();
  
  const mergedHeaders = {
    ...authHeaders,
    ...options.headers,
  };
  
  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
} 