import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    // Get the auth token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    // Create a Supabase client with the token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for admin role
    const isAdmin = user.user_metadata?.role === 'admin' || 
                    user.app_metadata?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Use service client to bypass RLS
    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ bookings: data || [] });
  } catch (error: any) {
    console.error('Failed to load admin bookings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load bookings' },
      { status: 500 }
    );
  }
}


