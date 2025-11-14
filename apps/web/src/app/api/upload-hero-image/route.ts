import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userRole = formData.get('userRole') as string; // Pass role from client

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check Supabase configuration first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isSupabaseConfigured = supabaseUrl && 
                                  supabaseUrl !== '' &&
                                  supabaseUrl !== 'https://placeholder.supabase.co';
    
    if (!isSupabaseConfigured) {
      return NextResponse.json({ 
        error: 'Supabase is not configured. Please configure Supabase to use storage.' 
      }, { status: 500 });
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // For demo accounts, check role from form data
    // For Supabase users, check role from user metadata
    const isAdmin = user 
      ? user.user_metadata?.role === 'admin'
      : userRole === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    // For storage uploads, we might need to use service role key
    // But for now, try with the current client - if it fails, we'll get a permission error

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    // Create a 'hero-images' bucket if it doesn't exist (you'll need to create this in Supabase dashboard)
    const fileName = `peace-sign-background-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `hero/${fileName}`;

    const { data, error } = await supabase.storage
      .from('hero-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('hero-images')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

