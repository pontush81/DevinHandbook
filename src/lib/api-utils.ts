/**
 * API-relaterade hjälpfunktioner
 * Endast för användning i serverkomponenter och API-rutter
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

/**
 * Kontrollerar om miljövariabler är korrekt konfigurerade
 */
export function checkEnvironment() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    console.error('SERVICE_ROLE_KEY saknas i miljövariabler - admin-operationer kommer att misslyckas');
    return false;
  }
  
  return true;
}

/**
 * Gemensam hantering för API-rutter
 * Hanterar felhantering och autentisering
 */
export async function apiHandler(
  req: NextRequest,
  handler: (userId: string | null, adminClient: ReturnType<typeof getAdminClient>) => Promise<NextResponse>
) {
  // Säkerställ att service role key finns
  if (!checkEnvironment()) {
    return NextResponse.json(
      { error: 'Servern är felkonfigurerad' },
      { status: 500 }
    );
  }
  
  try {
    // Skapa admin-klient
    const adminClient = getAdminClient();
    
    // Försök hämta användar-ID från auth-cookie om den finns
    let userId: string | null = null;
    
    try {
      const supabase = getAdminClient();
      const cookieStore = cookies();
      const authCookie = cookieStore.get('sb-refresh-token')?.value;
      
      if (authCookie) {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      }
    } catch (error) {
      console.error('Fel vid cookie-parsing:', error);
    }
    
    // Anropa den faktiska handler-funktionen
    return await handler(userId, adminClient);
  } catch (error) {
    console.error('API error:', error);
    
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
}

/**
 * Skapar en profil för en användare med service role
 * Kan anropas direkt från API-rutter
 */
export async function createUserProfileWithAdmin(
  userId: string,
  email: string
) {
  if (!userId || !email) {
    console.error('createUserProfileWithAdmin: Felaktiga indata', { userId, email });
    return false;
  }
  
  try {
    const adminClient = getAdminClient();
    
    // Kontrollera om profilen redan finns
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (existingProfile) {
      return true;
    }
    
    // Skapa profilen
    const { error } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        email,
        created_at: new Date().toISOString(),
        is_superadmin: false
      });
    
    if (error) {
      console.error('Kunde inte skapa profil:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Oväntat fel vid profilskapande:', error);
    return false;
  }
} 