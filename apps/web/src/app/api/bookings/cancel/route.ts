import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (['cancelled', 'rejected'].includes(booking.status)) {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
    }

    const newPaymentStatus =
      booking.payment_status === 'paid' ? 'refunded' : booking.payment_status;

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: newPaymentStatus,
      })
      .eq('id', bookingId);

    if (updateError) {
      throw updateError;
    }

    // Release availability slots
    try {
      const start = new Date(booking.check_in);
      const end = new Date(booking.check_out);
      const days: string[] = [];
      for (
        let cursor = new Date(start);
        cursor < end;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        days.push(cursor.toISOString().split('T')[0]);
      }
      if (days.length > 0) {
        await supabase
          .from('property_availability')
          .delete()
          .eq('property_id', booking.property_id)
          .in('day', days);
      }
    } catch (availabilityError) {
      console.warn('Failed to release availability:', availabilityError);
    }

    // Notify host
    if (booking.host_id) {
      await supabase.from('notifications').insert({
        user_id: booking.host_id,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `${booking.guest_name || 'Guest'} cancelled their booking for ${
          booking.property_name || 'your property'
        }.`,
        related_booking_id: booking.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}


