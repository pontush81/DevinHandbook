import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Checking Supabase storage configuration...');
    
    const supabase = getServiceSupabase();
    
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ [DEBUG] Error listing buckets:', bucketsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to list buckets',
        details: bucketsError
      }, { status: 500 });
    }
    
    console.log('📦 [DEBUG] Available buckets:', buckets?.map(b => ({ name: b.name, id: b.id, public: b.public })));
    
    // Check if handbook_files bucket exists
    const handbookFilesBucket = buckets?.find(b => b.name === 'handbook_files');
    
    if (!handbookFilesBucket) {
      console.log('⚠️ [DEBUG] handbook_files bucket not found, attempting to create...');
      
      // Create the bucket
      const { data: createData, error: createError } = await supabase.storage.createBucket('handbook_files', {
        public: true,
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp',
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
        ],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('❌ [DEBUG] Error creating bucket:', createError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create bucket',
          details: createError,
          buckets: buckets?.map(b => b.name)
        }, { status: 500 });
      }
      
      console.log('✅ [DEBUG] handbook_files bucket created successfully');
      
      return NextResponse.json({
        success: true,
        message: 'handbook_files bucket created successfully',
        bucket: createData,
        allBuckets: buckets?.map(b => b.name)
      });
    } else {
      console.log('✅ [DEBUG] handbook_files bucket already exists');
      
      return NextResponse.json({
        success: true,
        message: 'handbook_files bucket exists',
        bucket: handbookFilesBucket,
        allBuckets: buckets?.map(b => b.name)
      });
    }
    
  } catch (error) {
    console.error('💥 [DEBUG] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 