import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseFromRequest } from '@/lib/auth/getUserFromRequest';
import { createServiceClient } from '@/lib/supabase/service';
import { processBookingReject } from '@/lib/bookings/processBookingReject';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, reason } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const auth = await getAuthenticatedSupabaseFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { user, supabase } = auth;

    const result = await processBookingReject({
      bookingId,
      reason: reason.trim(),
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
      message: 'Booking rejected successfully',
    });
  } catch (error: unknown) {
    console.error('Error rejecting booking:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
