import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co') {
      // In demo mode, just return success
      return NextResponse.json({ success: true, message: 'Demo mode' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('pending_host_applications')
      .insert({
        email,
        name,
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An application with this email already exists', code: '23505' }, { status: 400 });
      }
      console.error('Database error in host application route:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Server error in host application route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
