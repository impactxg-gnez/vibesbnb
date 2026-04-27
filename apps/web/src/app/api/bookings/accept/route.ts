import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing booking ID' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Booking is not pending approval' },
        { status: 400 }
      );
    }

    if (booking.host_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this booking' },
        { status: 403 }
      );
    }

    const alreadyPaid = booking.payment_status === 'paid';
    const nextStatus = alreadyPaid ? 'confirmed' : 'accepted';

    // Update booking status (scoped to this host)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: nextStatus,
        host_approved_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('host_id', user.id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept booking', details: updateError.message },
        { status: 500 }
      );
    }

    // Get host name for notifications / email
    let hostName = 'Your Host';
    try {
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', booking.host_id)
        .single();
      if (hostProfile?.full_name) {
        hostName = hostProfile.full_name;
      }
    } catch (e) {
      console.warn('Could not fetch host name:', e);
    }

    if (alreadyPaid) {
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        type: 'booking_confirmed',
        title: 'Booking confirmed!',
        message: `Your stay at ${booking.property_name} is confirmed. The host accepted your request.`,
        related_booking_id: booking.id,
      });
    } else {
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        type: 'booking_accepted',
        title: 'Booking Accepted!',
        message: `Your booking for ${booking.property_name} has been accepted. Please proceed with payment.`,
        related_booking_id: booking.id,
      });
    }

    // Send email notification to guest
    if (booking.guest_email) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        await fetch(`${appUrl}/api/notifications/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: booking.guest_email,
            subject: alreadyPaid
              ? `Booking confirmed: ${booking.property_name}`
              : `Booking accepted: ${booking.property_name}`,
            template: alreadyPaid ? 'booking_confirmed' : 'booking_accepted',
            data: {
              propertyName: booking.property_name,
              hostName: hostName,
              checkIn: booking.check_in,
              checkOut: booking.check_out,
              guests: booking.guests,
              totalPrice: booking.total_price,
              bookingId: booking.id,
              location: booking.location,
            },
          }),
        });
      } catch (emailError) {
        console.warn('Failed to send email notification:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Booking accepted successfully',
    });
  } catch (error: any) {
    console.error('Error accepting booking:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

