import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { processBookingReject } from '@/lib/bookings/processBookingReject';

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

    const body = await request.json();
    const reason =
      typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : 'Declined by VibesBNB support';

    const serviceSupabase = createServiceClient();

    const result = await processBookingReject({
      bookingId,
      reason,
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
      message: 'Booking rejected. Guest has been notified.',
    });
  } catch (error: unknown) {
    console.error('Admin reject booking error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
