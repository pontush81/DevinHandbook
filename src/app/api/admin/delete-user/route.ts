import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Skapa admin-klient med service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-postadress krävs' }, { status: 400 });
    }

    console.log(`[Admin] Försöker radera användare med e-post: ${email}`);

    // Hitta användaren först
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[Admin] Fel vid listning av användare:', listError);
      return NextResponse.json({ error: 'Kunde inte hämta användarlista' }, { status: 500 });
    }

    const userToDelete = users.users.find(user => user.email === email);
    
    if (!userToDelete) {
      console.log(`[Admin] Ingen användare hittad med e-post: ${email}`);
      return NextResponse.json({ message: 'Ingen användare hittad med den e-postadressen' }, { status: 404 });
    }

    console.log(`[Admin] Hittade användare med ID: ${userToDelete.id}`);

    // Radera alla handböcker som användaren äger
    const { data: handbooks, error: handbooksError } = await supabaseAdmin
      .from('handbooks')
      .select('id')
      .eq('owner_id', userToDelete.id);

    if (handbooksError) {
      console.error('[Admin] Fel vid hämtning av handböcker:', handbooksError);
    } else if (handbooks && handbooks.length > 0) {
      console.log(`[Admin] Raderar ${handbooks.length} handböcker för användaren`);
      
      for (const handbook of handbooks) {
        // Radera sidor först (på grund av foreign key constraints)
        await supabaseAdmin.from('pages').delete().eq('handbook_id', handbook.id);
        // Radera sektioner
        await supabaseAdmin.from('sections').delete().eq('handbook_id', handbook.id);
        // Radera medlemskap
        await supabaseAdmin.from('handbook_members').delete().eq('handbook_id', handbook.id);
        // Radera handboken
        await supabaseAdmin.from('handbooks').delete().eq('id', handbook.id);
      }
    }

    // Radera användarens profil från public.profiles tabellen
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userToDelete.id);

    if (profileError) {
      console.error('[Admin] Fel vid radering av profil:', profileError);
    } else {
      console.log(`[Admin] Raderade profil för användare: ${userToDelete.id}`);
    }

    // Radera användaren från auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);

    if (deleteError) {
      console.error('[Admin] Fel vid radering av användare:', deleteError);
      return NextResponse.json({ error: 'Kunde inte radera användaren' }, { status: 500 });
    }

    console.log(`[Admin] Användare ${email} raderad framgångsrikt`);

    return NextResponse.json({ 
      message: 'Användare raderad framgångsrikt',
      deletedUserId: userToDelete.id,
      deletedEmail: email
    });

  } catch (error) {
    console.error('[Admin] Oväntat fel:', error);
    return NextResponse.json({ error: 'Internt serverfel' }, { status: 500 });
  }
} 