import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const bookingId = params.id?.trim();
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking: data });
  } catch (error: unknown) {
    console.error('Failed to load admin booking:', error);
    const message = error instanceof Error ? error.message : 'Failed to load booking';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
