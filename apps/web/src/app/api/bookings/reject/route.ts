import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

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
