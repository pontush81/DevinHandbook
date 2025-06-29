import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getHybridAuth, isHandbookAdmin } from '@/lib/standard-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('🖼️ [Upload Image] Request received');
    
    // 1. Check authentication with hybrid auth (handles cookies, Bearer tokens, and query params)
    console.log('🔐 [Upload Image] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Upload Image] Authentication failed - no userId found');
      return NextResponse.json(
        { success: 0, message: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ [Upload Image] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const handbookId = formData.get('handbook_id') as string;
    
    console.log('📝 [Upload Image] Form data:', {
      hasImage: !!image,
      imageSize: image?.size || 0,
      imageType: image?.type || 'unknown',
      handbookId: handbookId || 'missing',
      userId: authResult.userId
    });

    if (!image) {
      console.log('❌ [Upload Image] No image file provided');
      return NextResponse.json(
        { success: 0, message: 'No image file provided' },
        { status: 400 }
      );
    }

    if (!handbookId) {
      console.log('❌ [Upload Image] No handbook ID provided');
      return NextResponse.json(
        { success: 0, message: 'Handbook ID is required' },
        { status: 400 }
      );
    }

    // Validate handbook_id format (basic security check)
    if (!/^[a-zA-Z0-9-_]+$/.test(handbookId)) {
      console.log('❌ [Upload Image] Invalid handbook_id format:', handbookId);
      return NextResponse.json(
        { success: 0, message: 'Invalid handbook ID format' },
        { status: 400 }
      );
    }

    console.log('🔍 [Upload Image] Checking admin privileges for handbook:', handbookId);

    // 2. Check if user is admin for this handbook
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Upload Image] User lacks admin privileges');
      return NextResponse.json(
        { success: 0, message: 'Admin access required for this handbook' },
        { status: 403 }
      );
    }

    console.log('✅ [Upload Image] Admin privileges confirmed, proceeding with upload...');

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(image.type)) {
      console.log('❌ [Upload Image] Invalid file type:', image.type);
      return NextResponse.json(
        { success: 0, message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (image.size > maxSize) {
      console.log('❌ [Upload Image] File too large:', image.size);
      return NextResponse.json(
        { success: 0, message: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename with handbook separation
    const fileExt = image.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${handbookId}/images/${fileName}`;

    console.log('📤 [Upload Image] Uploading to storage:', filePath);

    // Use service role client to bypass RLS policies
    const supabase = getServiceSupabase();

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('handbook_files')
      .upload(filePath, image, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ [Upload Image] Supabase upload error:', uploadError);
      return NextResponse.json(
        { success: 0, message: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('handbook_files')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('❌ [Upload Image] Failed to get public URL');
      return NextResponse.json(
        { success: 0, message: 'Failed to get image URL' },
        { status: 500 }
      );
    }

    console.log('✅ [Upload Image] Image uploaded successfully:', urlData.publicUrl);

    // Return EditorJS expected format
    return NextResponse.json({
      success: 1,
      file: {
        url: urlData.publicUrl,
        // Optional: Add additional metadata
        name: image.name,
        size: image.size,
        type: image.type
      }
    });

  } catch (error) {
    console.error('❌ [Upload Image] Unexpected error:', error);
    return NextResponse.json(
      { success: 0, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 