import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

async function revalidateHandbook(subdomain: string) {
  try {
    revalidatePath(`/handbook/${subdomain}`);
    return { success: true };
  } catch (error) {
    console.error('Error revalidating handbook:', error);
    return { success: false, error };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { subdomain } = await req.json();
    
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }
    
    const result = await revalidateHandbook(subdomain);
    
    if (!result.success) {
      throw result.error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error revalidating handbook:', error);
    return NextResponse.json(
      { error: 'Failed to revalidate handbook' },
      { status: 500 }
    );
  }
}
