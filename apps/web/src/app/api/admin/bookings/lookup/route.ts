import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const propertyId = request.nextUrl.searchParams.get('propertyId')?.trim();
    const travellerId = request.nextUrl.searchParams.get('travellerId')?.trim();
    const status =
      request.nextUrl.searchParams.get('status')?.trim() || 'pending_approval';

    if (!propertyId || !travellerId) {
      return NextResponse.json(
        { error: 'propertyId and travellerId are required' },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('user_id', travellerId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({ booking: data ?? null });
  } catch (error: unknown) {
    console.error('Failed to lookup admin booking:', error);
    const message = error instanceof Error ? error.message : 'Failed to lookup booking';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
