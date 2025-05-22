import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, createUserProfileWithAdmin } from '@/lib/api-utils';

/**
 * API-rutt för att skapa en användarprofil med service role
 * Används när vi behöver kringgå RLS-regler för att skapa profiler
 */
export async function POST(req: NextRequest) {
  return apiHandler(req, async (userId, adminClient) => {
    try {
      // Kontrollera auth och admin-status
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Hämta användardata från request
      const { user_id, email } = await req.json();
      
      // Validera indata
      if (!user_id || !email) {
        return NextResponse.json(
          { error: 'Användar-ID och e-post måste anges' }, 
          { status: 400 }
        );
      }
      
      // Skapa profilen med admin-klienten
      const success = await createUserProfileWithAdmin(user_id, email);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Kunde inte skapa profil' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Fel vid profilskapande:', error);
      return NextResponse.json(
        { error: 'Internt serverfel' },
        { status: 500 }
      );
    }
  });
} 