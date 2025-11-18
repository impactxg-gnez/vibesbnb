import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      property_id,
      property_name,
      property_image,
      location,
      check_in,
      check_out,
      guests,
      kids,
      pets,
      total_price,
      special_requests,
      guest_name,
      guest_email,
    } = body;

    // Validate required fields
    if (!property_id || !check_in || !check_out || !guests || !total_price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get authenticated user from server-side Supabase client
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get property to find host_id
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('host_id')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const hostId = property.host_id;
    if (!hostId) {
      return NextResponse.json(
        { error: 'Property has no host assigned' },
        { status: 400 }
      );
    }

    // Get host contact information
    // We'll use service role key to access host user metadata
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let hostEmail = '';
    let hostWhatsApp = '';

    if (supabaseServiceKey && supabaseUrl) {
      try {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js');
        const serviceSupabase = createServiceClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: hostUser } = await serviceSupabase.auth.admin.getUserById(hostId);
        if (hostUser?.user) {
          hostEmail = hostUser.user.user_metadata?.host_email || hostUser.user.email || '';
          hostWhatsApp = hostUser.user.user_metadata?.whatsapp || '';
        }
      } catch (e) {
        console.warn('Could not fetch host info with service role:', e);
      }
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        host_id: hostId,
        property_id,
        property_name,
        property_image,
        location,
        check_in: check_in,
        check_out: check_out,
        guests,
        kids: kids || 0,
        pets: pets || 0,
        total_price,
        status: 'pending_approval',
        guest_name,
        guest_email,
        host_email: hostEmail,
        host_whatsapp: hostWhatsApp,
        special_requests: special_requests || null,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError.message },
        { status: 500 }
      );
    }

    // Send notifications to host
    try {
      // 1. Create in-app notification (trigger will handle this, but we'll also create one explicitly)
      await supabase
        .from('notifications')
        .insert({
          user_id: hostId,
          type: 'booking_request',
          title: 'New Booking Request',
          message: `You have a new booking request for ${property_name} from ${guest_name}.`,
          related_booking_id: booking.id,
        });

      // 2. Send email notification (if host email is provided)
      if (hostEmail) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
          await fetch(`${appUrl}/api/notifications/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: hostEmail,
              subject: `New Booking Request: ${property_name}`,
              template: 'booking_request',
              data: {
                propertyName: property_name,
                guestName: guest_name,
                checkIn: check_in,
                checkOut: check_out,
                guests,
                totalPrice: total_price,
                bookingId: booking.id,
              },
            }),
          });
        } catch (emailError) {
          console.warn('Failed to send email notification:', emailError);
          // Don't fail the booking if email fails
        }
      }

      // 3. Send WhatsApp notification (if host WhatsApp is provided)
      if (hostWhatsApp) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
          await fetch(`${appUrl}/api/notifications/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: hostWhatsApp,
              message: `🔔 New Booking Request!\n\nProperty: ${property_name}\nGuest: ${guest_name}\nDates: ${check_in} to ${check_out}\nGuests: ${guests}\nTotal: $${total_price}\n\nPlease check your dashboard to accept or decline.`,
            }),
          });
        } catch (whatsappError) {
          console.warn('Failed to send WhatsApp notification:', whatsappError);
          // Don't fail the booking if WhatsApp fails
        }
      }
    } catch (notificationError) {
      console.warn('Error sending notifications:', notificationError);
      // Don't fail the booking if notifications fail
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
      },
    });
  } catch (error: any) {
    console.error('Error in booking creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

