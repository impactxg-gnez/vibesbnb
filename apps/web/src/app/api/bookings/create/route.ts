import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { nightsBetweenYmd } from '@/lib/dateUtils';
import { normalizeMinBookingNights } from '@/lib/minBookingNights';
import { computeBookingGrandTotal, totalsMatchCents } from '@/lib/bookingTotals';
import { dispatchPushToUser } from '@/lib/pushDispatch';
import {
  assertStayDoesNotConflict,
  blockBookingNights,
  holdBookingNights,
} from '@/lib/bookingAvailability';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

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
      guest_agreement_accepted,
      guest_agreement_signer_name,
      wellness_line_items,
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
    const { data: propertyRow, error: propertyError } = await serviceSupabase
      .from('properties')
      .select(
        'host_id, name, images, guest_agreement_url, min_booking_nights, price, cleaning_fee, allow_direct_booking'
      )
      .eq('id', property_id)
      .single();

    if (propertyError || !propertyRow) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const hostId = propertyRow.host_id;
    if (!hostId) {
      return NextResponse.json(
        { error: 'Property has no host assigned' },
        { status: 400 }
      );
    }

    if (String(hostId) === String(userId)) {
      return NextResponse.json(
        { error: 'Hosts cannot create bookings for their own properties' },
        { status: 400 }
      );
    }

    const signer = typeof guest_agreement_signer_name === 'string' ? guest_agreement_signer_name.trim() : '';
    if (guest_agreement_accepted !== true || signer.length < 2) {
      return NextResponse.json(
        {
          error:
            'You must accept the house rules and guest agreement and enter your full legal name before booking.',
        },
        { status: 400 }
      );
    }

    const stayNights = nightsBetweenYmd(
      String(check_in),
      String(check_out)
    );
    if (stayNights <= 0) {
      return NextResponse.json(
        { error: 'Invalid check-in and check-out dates' },
        { status: 400 }
      );
    }
    const minStay = normalizeMinBookingNights(propertyRow.min_booking_nights);
    if (minStay != null && stayNights < minStay) {
      return NextResponse.json(
        {
          error: `This property requires a minimum stay of ${minStay} night${minStay === 1 ? '' : 's'}.`,
        },
        { status: 400 }
      );
    }

    const wellnessRaw = Array.isArray(wellness_line_items) ? wellness_line_items : [];
    const wellnessLineItemsSanitized = wellnessRaw
      .filter(
        (row: unknown) =>
          row &&
          typeof row === 'object' &&
          typeof (row as { id?: unknown }).id === 'string' &&
          typeof (row as { name?: unknown }).name === 'string'
      )
      .map((row: Record<string, unknown>) => ({
        id: String(row.id),
        name: String(row.name),
        category: typeof row.category === 'string' ? row.category : '',
        price: Math.max(0, Number(row.price) || 0),
        image: typeof row.image === 'string' ? row.image : row.image === null ? null : undefined,
      }));

    const cleaning = propertyRow.cleaning_fee != null ? Number(propertyRow.cleaning_fee) : 0;
    const { grandTotal: expectedGrandTotal } = computeBookingGrandTotal({
      propertyNightlyPrice: Number(propertyRow.price) || 0,
      cleaningFee: cleaning,
      checkInYmd: String(check_in),
      checkOutYmd: String(check_out),
      selectedUnits: selected_units,
      wellnessLineItems: wellnessLineItemsSanitized,
    });

    if (!totalsMatchCents(Number(total_price), expectedGrandTotal)) {
      return NextResponse.json(
        {
          error:
            'Total price mismatch. Refresh the checkout page and try again so stay + wellness supplies match.',
        },
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

    const allowDirectBooking = propertyRow.allow_direct_booking === true;

    const conflict = await assertStayDoesNotConflict(serviceSupabase, {
      propertyId: String(property_id),
      bookingId: '00000000-0000-0000-0000-000000000000',
      checkInYmd: String(check_in),
      checkOutYmd: String(check_out),
      selectedUnits: selected_units,
    });
    if (!conflict.ok) {
      return NextResponse.json({ error: conflict.message }, { status: 409 });
    }

    const initialStatus = allowDirectBooking ? 'accepted' : 'pending_approval';

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
        status: initialStatus,
        ...(allowDirectBooking ? { host_approved_at: new Date().toISOString() } : {}),
        guest_name,
        guest_email,
        host_email: hostEmail,
        host_whatsapp: hostWhatsApp,
        special_requests: special_requests || null,
        payment_status: 'pending',
        selected_units: selected_units || null,
        guest_agreement_accepted_at: new Date().toISOString(),
        guest_agreement_signer_name: signer,
        guest_agreement_document_url: propertyRow.guest_agreement_url || null,
        wellness_line_items:
          wellnessLineItemsSanitized.length > 0 ? wellnessLineItemsSanitized : [],
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

    try {
      if (allowDirectBooking) {
        await blockBookingNights(serviceSupabase, {
          propertyId: String(property_id),
          hostId: String(hostId),
          bookingId: String(booking.id),
          checkInYmd: String(check_in),
          checkOutYmd: String(check_out),
          selectedUnits: selected_units,
        });
      } else {
        await holdBookingNights(serviceSupabase, {
          propertyId: String(property_id),
          hostId: String(hostId),
          bookingId: String(booking.id),
          checkInYmd: String(check_in),
          checkOutYmd: String(check_out),
          selectedUnits: selected_units,
        });
      }
      void invalidatePropertyListingCaches(String(property_id));
    } catch (holdError) {
      console.error('Failed to place calendar hold:', holdError);
      await supabase.from('bookings').delete().eq('id', booking.id);
      return NextResponse.json(
        { error: 'Could not reserve those dates. Please try different dates.' },
        { status: 409 }
      );
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
        await supabase
          .from('conversations')
          .update({
            booking_id: booking.id,
            last_message: 'Booking request created',
            last_message_at: new Date().toISOString(),
          })
          .eq('id', existingConversation.id);
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

      if (conversationId) {
        const requestSummary = [
          `📋 New booking request for ${property_name}`,
          `Dates: ${check_in} → ${check_out}`,
          `Guests: ${guests}${kids ? ` (+${kids} kids)` : ''}${pets ? ` (+${pets} pets)` : ''}`,
          special_requests ? `Special requests: ${special_requests}` : null,
          `Total: $${total_price}`,
        ]
          .filter(Boolean)
          .join('\n');

        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: userId,
          body: requestSummary,
        });

        if (!allowDirectBooking) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: userId,
            body:
              'Thanks for your request! The host has been notified and will respond soon. You can continue the conversation here while you wait.',
          });
        }
      }
    } catch (conversationError) {
      console.warn('Failed to ensure conversation:', conversationError);
    }

    // Send notifications to host
    try {
      // In-app notification: handled by DB trigger (notify_host_on_booking).

      // Email notification (if host email is provided)
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

      // WhatsApp notification (if host WhatsApp is provided)
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

      await dispatchPushToUser(
        hostId,
        'New booking request',
        `${guest_name} requested ${property_name} (${check_in} → ${check_out}).`,
        { stage: 'booking_request_created', bookingId: booking.id }
      );
    } catch (notificationError) {
      console.warn('Error sending notifications:', notificationError);
      // Don't fail the booking if notifications fail
    }

    try {
      await dispatchPushToUser(
        userId,
        'Booking request sent',
        `We notified the host about ${property_name}.`,
        { stage: 'booking_request_received', bookingId: booking.id }
      );
    } catch (_) {
      /* non-fatal */
    }

    if (guest_email) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        await fetch(`${appUrl}/api/notifications/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: guest_email,
            subject: `Request sent: ${property_name}`,
            template: 'booking_request_submitted',
            data: {
              propertyName: property_name,
              guestName: guest_name,
              checkIn: check_in,
              checkOut: check_out,
              bookingId: booking.id,
            },
          }),
        });
      } catch (e) {
        console.warn('Failed to send guest confirmation email:', e);
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
      },
      conversationId,
      allowDirectBooking,
      requiresHostApproval: !allowDirectBooking,
    });
  } catch (error: any) {
    console.error('Error in booking creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

