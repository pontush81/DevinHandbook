import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

async function toggleHandbookPublished(id: string, published: boolean) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('handbooks')
      .update({ published })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (data.subdomain) {
      revalidatePath(`/handbook/${data.subdomain}`);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error toggling handbook published status:', error);
    return { success: false, error };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, published } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Handbook ID is required' },
        { status: 400 }
      );
    }
    
    if (typeof published !== 'boolean') {
      return NextResponse.json(
        { error: 'Published status must be a boolean' },
        { status: 400 }
      );
    }
    
    const result = await toggleHandbookPublished(id, published);
    
    if (!result.success) {
      throw result.error;
    }
    
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('Error toggling handbook published status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle handbook published status' },
      { status: 500 }
    );
  }
}
