import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

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
      selected_units,
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

    const serviceSupabase = createServiceClient();

    // Get property to find host_id
    const { data: property, error: propertyError } = await serviceSupabase
      .from('properties')
      .select('host_id, name, images')
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
    let hostEmail = '';
    let hostWhatsApp = '';
    let hostName = 'Host';
    let hostAvatar = '';

    try {
      const { data: hostUser } = await serviceSupabase.auth.admin.getUserById(hostId);
      if (hostUser?.user) {
        hostEmail = hostUser.user.user_metadata?.host_email || hostUser.user.email || '';
        hostWhatsApp = hostUser.user.user_metadata?.whatsapp || '';
        hostName =
          hostUser.user.user_metadata?.full_name ||
          hostUser.user.user_metadata?.display_name ||
          hostUser.user.email ||
          'Host';
        hostAvatar =
          hostUser.user.user_metadata?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${hostName}`;
      }
    } catch (e) {
      console.warn('Could not fetch host info with service role:', e);
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
        selected_units: selected_units || null,
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

    // Mark booked dates in availability table using service client (bypasses RLS)
    try {
      const start = new Date(check_in);
      const end = new Date(check_out);

      const unitsToBlock = (selected_units && Array.isArray(selected_units) && selected_units.length > 0)
        ? selected_units
        : [{ id: null }]; // Default to property-wide if no units specified

      for (const unit of unitsToBlock) {
        const daysToBlock: { 
          day: string; 
          status: 'booked'; 
          property_id: string; 
          host_id: string; 
          room_id: string | null;
          booking_id: string;
        }[] = [];
        
        for (
          let cursor = new Date(start);
          cursor < end;
          cursor.setDate(cursor.getDate() + 1)
        ) {
          const dateKey = cursor.toISOString().split('T')[0];
          daysToBlock.push({
            day: dateKey,
            status: 'booked',
            property_id,
            host_id: hostId,
            room_id: unit.id || null,
            booking_id: booking.id,
          });
        }

        if (daysToBlock.length > 0) {
          // Use service client to bypass RLS - travelers can't insert directly
          // We need to handle upserts manually due to partial unique indexes
          for (const block of daysToBlock) {
            // First try to update existing entry
            let updateQuery = serviceSupabase
              .from('property_availability')
              .update({
                status: 'booked',
                booking_id: block.booking_id,
                host_id: block.host_id,
              })
              .eq('property_id', block.property_id)
              .eq('day', block.day);

            if (block.room_id) {
              updateQuery = updateQuery.eq('room_id', block.room_id);
            } else {
              updateQuery = updateQuery.is('room_id', null);
            }

            const { data: updated, error: updateError } = await updateQuery.select();
            
            // If no rows updated, insert new entry
            if (!updateError && (!updated || updated.length === 0)) {
              const { error: insertError } = await serviceSupabase
                .from('property_availability')
                .insert(block);
              
              if (insertError) {
                console.warn('Failed to insert booked day:', block.day, insertError);
              }
            } else if (updateError) {
              console.warn('Failed to update booked day:', block.day, updateError);
            }
          }
        }
      }
    } catch (availabilityError) {
      console.warn('Failed to mark booked days:', availabilityError);
    }

    // Ensure conversation exists between traveller and host
    let conversationId: string | null = null;
    try {
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id, host_name, traveller_name')
        .eq('property_id', property_id)
        .eq('traveller_id', userId)
        .single();

      if (existingConversation?.id) {
        conversationId = existingConversation.id;
        if (!existingConversation.host_name || !existingConversation.traveller_name) {
          const travellerName =
            user.user_metadata?.full_name || user.user_metadata?.display_name || user.email || 'Traveller';
          const travellerAvatar =
            user.user_metadata?.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${travellerName}`;

          const updatePayload: Record<string, string> = {};
          if (!existingConversation.host_name) {
            updatePayload.host_name = hostName;
            updatePayload.host_avatar = hostAvatar;
          }
          if (!existingConversation.traveller_name) {
            updatePayload.traveller_name = travellerName;
            updatePayload.traveller_avatar = travellerAvatar;
          }

          if (Object.keys(updatePayload).length > 0) {
            await supabase.from('conversations').update(updatePayload).eq('id', existingConversation.id);
          }
        }
      } else {
        const travellerName =
          user.user_metadata?.full_name || user.user_metadata?.display_name || user.email || 'Traveller';
        const travellerAvatar =
          user.user_metadata?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${travellerName}`;

        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            property_id,
            host_id: hostId,
            traveller_id: userId,
            booking_id: booking.id,
            last_message: 'Booking request created',
            last_message_at: new Date().toISOString(),
            host_name: hostName,
            host_avatar: hostAvatar,
            traveller_name: travellerName,
            traveller_avatar: travellerAvatar,
          })
          .select()
          .single();

        if (conversationError) {
          throw conversationError;
        }

        conversationId = newConversation?.id ?? null;
      }
    } catch (conversationError) {
      console.warn('Failed to ensure conversation:', conversationError);
    }

    // Send notifications to host
    try {
      // 1. Create in-app notification (trigger will handle this, but we'll also create one explicitly)
      await serviceSupabase
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

