import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { processBookingAccept } from '@/lib/bookings/processBookingAccept';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const serviceSupabase = createServiceClient();

    const result = await processBookingAccept({
      bookingId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      actorUserId: auth.user.id,
      isAdmin: true,
      requestOrigin: request.nextUrl.origin,
      supabase: serviceSupabase,
      serviceSupabase,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking approved. Guest has been notified to complete payment.',
      check_in: result.check_in,
      check_out: result.check_out,
      total_price: result.total_price,
      status: result.status,
    });
  } catch (error: unknown) {
    console.error('Admin accept booking error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
