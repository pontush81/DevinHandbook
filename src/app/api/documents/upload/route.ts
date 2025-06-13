import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initiera Supabase client med service role för server-side operationer
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Ingen fil hittades' }, { status: 400 });
    }

    // Validera filtyp
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Filtypen stöds inte. Tillåtna filtyper: PDF, Word, textfiler och bilder (JPG, PNG, GIF, WebP).' 
      }, { status: 400 });
    }

    // Validera filstorlek (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Filen är för stor. Max storlek är 10MB.' 
      }, { status: 400 });
    }

    // Generera unikt filnamn
    const fileId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${fileId}.${fileExtension}`;
    const storagePath = `imports/${fileName}`;

    // Ladda upp till Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document_imports')
      .upload(storagePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Kunde inte ladda upp filen' 
      }, { status: 500 });
    }

    // Spara metadata i databasen
    const { data: dbData, error: dbError } = await supabase
      .from('document_imports')
      .insert({
        id: fileId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
        status: 'uploaded',
        metadata: {
          original_name: file.name,
          upload_time: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Rensa upp filen från storage om databasen misslyckades
      await supabase.storage.from('document_imports').remove([storagePath]);
      return NextResponse.json({ 
        error: 'Kunde inte spara filmetadata' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      fileId: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Ett oväntat fel inträffade' 
    }, { status: 500 });
  }
} 