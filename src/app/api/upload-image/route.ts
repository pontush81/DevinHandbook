import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession, isHandbookAdmin } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: 0, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const handbookId = formData.get('handbook_id') as string;
    
    if (!image) {
      return NextResponse.json(
        { success: 0, message: 'No image provided' },
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
      return NextResponse.json(
        { success: 0, message: 'Invalid handbook ID format' },
        { status: 400 }
      );
    }

    // 2. Check if user is admin for this handbook
    const isAdmin = await isHandbookAdmin(session.user.id, handbookId);
    if (!isAdmin) {
      return NextResponse.json(
        { success: 0, message: 'Admin permissions required for file upload' },
        { status: 403 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        { success: 0, message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (image.size > maxSize) {
      return NextResponse.json(
        { success: 0, message: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename with handbook separation
    const fileExt = image.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${handbookId}/images/${fileName}`;

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
      console.error('Supabase upload error:', uploadError);
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
      return NextResponse.json(
        { success: 0, message: 'Failed to get image URL' },
        { status: 500 }
      );
    }

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
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: 0, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 