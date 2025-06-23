import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession, isHandbookAdmin } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('🖼️ [Upload Image] Request received');
    
    // 1. Check authentication - try both cookies and Authorization header
    let session = null;
    let userId: string | null = null;
    
    // Try cookie-based authentication first
    session = await getServerSession();
    console.log('🔐 [Upload Image] Cookie session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id || 'no user' 
    });
    
    // If no cookie session, try Authorization header
    if (!session) {
      console.log('🔑 [Upload Image] Trying Authorization header fallback...');
      const authHeader = request.headers.get('authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('📝 [Upload Image] Found Bearer token, verifying...');
        
        try {
          // Create a Supabase client and verify the token
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          
          const { data: { user }, error } = await supabase.auth.getUser(token);
          
          if (error) {
            console.error('❌ [Upload Image] Token verification failed:', error);
          } else if (user) {
            console.log('✅ [Upload Image] Token verified successfully for user:', user.id);
            userId = user.id;
            // Create a session-like object for compatibility
            session = { user: { id: user.id, email: user.email } };
          }
        } catch (tokenError) {
          console.error('❌ [Upload Image] Error verifying token:', tokenError);
        }
      } else {
        console.log('📝 [Upload Image] No Authorization header found');
      }
    } else {
      userId = session.user?.id || null;
    }
    
    if (!session?.user || !userId) {
      console.log('❌ [Upload Image] No valid authentication found');
      return NextResponse.json(
        { success: 0, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const handbookId = formData.get('handbook_id') as string;
    
    console.log('📝 [Upload Image] Form data:', {
      hasImage: !!image,
      imageSize: image?.size || 0,
      imageType: image?.type || 'unknown',
      handbookId: handbookId || 'missing',
      userId
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

    // 2. Check if user is admin for this handbook
    console.log('🔍 [Upload Image] Checking admin permissions...');
    const isAdmin = await isHandbookAdmin(userId, handbookId);
    
    if (!isAdmin) {
      console.log('❌ [Upload Image] User is not admin for handbook');
      return NextResponse.json(
        { success: 0, message: 'Admin access required for this handbook' },
        { status: 403 }
      );
    }

    console.log('✅ [Upload Image] Admin check passed, proceeding with upload...');

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