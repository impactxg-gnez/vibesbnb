import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, reason } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing booking ID' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
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

    // Update booking status (scoped to this host)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'rejected',
        host_rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', bookingId)
      .eq('host_id', user.id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject booking', details: updateError.message },
        { status: 500 }
      );
    }

    // Create notification for guest
    await supabase
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        type: 'booking_rejected',
        title: 'Booking Declined',
        message: `Your booking request for ${booking.property_name} has been declined. Reason: ${reason}`,
        related_booking_id: booking.id,
      });

    // Send email notification to guest
    if (booking.guest_email) {
      try {
        // Get host name for the email
        let hostName = 'The Host';
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

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        await fetch(`${appUrl}/api/notifications/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: booking.guest_email,
            subject: `Booking Declined: ${booking.property_name}`,
            template: 'booking_rejected',
            data: {
              propertyName: booking.property_name,
              hostName: hostName,
              checkIn: booking.check_in,
              checkOut: booking.check_out,
              reason,
              bookingId: booking.id,
            },
          }),
        });
      } catch (emailError) {
        console.warn('Failed to send email notification:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Booking rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting booking:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

