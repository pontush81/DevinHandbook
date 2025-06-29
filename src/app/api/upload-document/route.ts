import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getHybridAuth, isHandbookAdmin } from '@/lib/standard-auth';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication with hybrid auth
    console.log('🔐 [Upload Document] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Upload Document] Authentication failed - no userId found');
      return NextResponse.json(
        { success: 0, message: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ [Upload Document] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const handbookId = formData.get('handbook_id') as string;
    
    console.log('📝 [Upload Document] Processing upload:', {
      hasFile: !!file,
      fileName: file?.name || 'none',
      fileSize: file?.size || 0,
      fileType: file?.type || 'unknown',
      handbookId: handbookId || 'missing'
    });
    
    if (!file) {
      return NextResponse.json(
        { success: 0, message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!handbookId) {
      return NextResponse.json(
        { success: 0, message: 'Handbook ID is required for security' },
        { status: 400 }
      );
    }

    // Validate handbook_id format (basic security check)
    if (!/^[a-zA-Z0-9-_]+$/.test(handbookId)) {
      console.log('❌ [Upload Document] Invalid handbook_id format:', handbookId);
      return NextResponse.json(
        { success: 0, message: 'Invalid handbook ID format' },
        { status: 400 }
      );
    }

    console.log('🔍 [Upload Document] Checking admin privileges for handbook:', handbookId);

    // 2. Check if user is admin for this handbook
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Upload Document] User lacks admin privileges');
      return NextResponse.json(
        { success: 0, message: 'Admin permissions required for file upload' },
        { status: 403 }
      );
    }

    console.log('✅ [Upload Document] Admin privileges confirmed');

    // Validate file type - document types
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/csv'
    ];
    
    if (!validTypes.includes(file.type)) {
      console.log('❌ [Upload Document] Invalid file type:', file.type);
      return NextResponse.json(
        { 
          success: 0, 
          message: 'Invalid file type. Only PDF, Word, Excel, PowerPoint, text, and CSV files are allowed.' 
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for documents)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.log('❌ [Upload Document] File too large:', file.size);
      return NextResponse.json(
        { success: 0, message: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename with handbook separation
    const originalName = file.name;
    const fileExt = originalName.split('.').pop() || 'pdf';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${handbookId}/documents/${fileName}`;

    console.log('📤 [Upload Document] Uploading to storage:', filePath);

    // Use service role client to bypass RLS policies
    const supabase = getServiceSupabase();

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('handbook_files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ [Upload Document] Supabase upload error:', uploadError);
      return NextResponse.json(
        { success: 0, message: 'Failed to upload document' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('handbook_files')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('❌ [Upload Document] Failed to get public URL');
      return NextResponse.json(
        { success: 0, message: 'Failed to get document URL' },
        { status: 500 }
      );
    }

    console.log('✅ [Upload Document] Document uploaded successfully:', urlData.publicUrl);

    // Return EditorJS AttachesTool expected format
    return NextResponse.json({
      success: 1,
      file: {
        url: urlData.publicUrl,
        size: file.size,
        name: originalName,
        extension: fileExt
      }
    });

  } catch (error) {
    console.error('❌ [Upload Document] Unexpected error:', error);
    return NextResponse.json(
      { success: 0, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 