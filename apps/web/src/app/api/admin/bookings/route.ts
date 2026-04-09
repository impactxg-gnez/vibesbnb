import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

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


