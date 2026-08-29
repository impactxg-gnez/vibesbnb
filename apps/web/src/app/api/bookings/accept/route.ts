import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseFromRequest } from '@/lib/auth/getUserFromRequest';
import { createServiceClient } from '@/lib/supabase/service';
import { processBookingAccept } from '@/lib/bookings/processBookingAccept';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, checkIn, checkOut } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const auth = await getAuthenticatedSupabaseFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { user, supabase } = auth;

    const result = await processBookingAccept({
      bookingId,
      checkIn,
      checkOut,
      actorUserId: user.id,
      requestOrigin: request.nextUrl.origin,
      supabase,
      serviceSupabase: createServiceClient(),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking accepted successfully',
      check_in: result.check_in,
      check_out: result.check_out,
      total_price: result.total_price,
    });
  } catch (error: unknown) {
    console.error('Error accepting booking:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
