import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseFromRequest } from '@/lib/auth/getUserFromRequest';
import { createServiceClient } from '@/lib/supabase/service';
import { nightsBetweenYmd } from '@/lib/dateUtils';
import { normalizeMinBookingNights } from '@/lib/minBookingNights';
import { computeBookingGrandTotal, totalsMatchCents } from '@/lib/bookingTotals';
import {
  computeEarlyLateFees,
  earlyCheckInTimeOptions,
  lateCheckOutTimeOptions,
  normalizeHhmm,
  policyFromDbRow,
} from '@/lib/checkInOutPolicy';
import { dispatchPushToUser } from '@/lib/pushDispatch';
import {
  assertStayDoesNotConflict,
  blockBookingNights,
  holdBookingNights,
} from '@/lib/bookingAvailability';
import { travellerNeedsPhoneVerification } from '@/lib/auth/hasVerifiedPhone';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';
import { normalizeCancellationPolicy } from '@/lib/cancellationPolicy';
import { getServiceFeePercent, getHostFeePercent } from '@/lib/platformSettings';
import { computeHostPayoutAmounts } from '@/lib/hostPayouts';
import { dispatchAdminNewBookingEmail } from '@/lib/notifications/dispatchAdminNewBookingEmail';
import { dispatchAdminNewChatEmail } from '@/lib/notifications/dispatchAdminNewChatEmail';

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
      early_check_in_requested,
      requested_early_check_in_time,
      late_check_out_requested,
      requested_late_check_out_time,
    } = body;

    // Validate required fields
    if (!property_id || !check_in || !check_out || !guests || !total_price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const auth = await getAuthenticatedSupabaseFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }
    const { user, supabase } = auth;
    const userId = user.id;

    if (travellerNeedsPhoneVerification(user)) {
      return NextResponse.json(
        {
          error:
            'A verified phone number is required before booking. Please verify your mobile number in your profile.',
          code: 'PHONE_NOT_VERIFIED',
        },
        { status: 403 }
      );
    }

    const serviceSupabase = createServiceClient();

    // Get property to find host_id
    const { data: propertyRow, error: propertyError } = await serviceSupabase
      .from('properties')
      .select(
        'host_id, name, images, guest_agreement_url, min_booking_nights, price, cleaning_fee, allow_direct_booking, guests, allow_extra_guests, extra_guest_price, refundable_deposit, check_in_time, check_out_time, early_check_in_allowed, earliest_early_check_in_time, early_check_in_fee, late_check_out_allowed, latest_late_check_out_time, late_check_out_fee, cancellation_policy'
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

    const checkInOutPolicy = policyFromDbRow(propertyRow as Record<string, unknown>);
    const earlyRequested = early_check_in_requested === true;
    const lateRequested = late_check_out_requested === true;
    let requestedEarly = earlyRequested
      ? normalizeHhmm(requested_early_check_in_time)
      : null;
    let requestedLate = lateRequested
      ? normalizeHhmm(requested_late_check_out_time)
      : null;

    if (earlyRequested) {
      if (!checkInOutPolicy.earlyCheckInAllowed) {
        return NextResponse.json(
          { error: 'Early check-in is not available for this property.' },
          { status: 400 }
        );
      }
      const allowedEarly = earlyCheckInTimeOptions(
        checkInOutPolicy.earliestEarlyCheckInTime,
        checkInOutPolicy.checkInTime
      );
      if (!requestedEarly || !allowedEarly.includes(requestedEarly)) {
        return NextResponse.json(
          { error: 'Please select a valid early check-in time.' },
          { status: 400 }
        );
      }
    } else {
      requestedEarly = null;
    }

    if (lateRequested) {
      if (!checkInOutPolicy.lateCheckOutAllowed) {
        return NextResponse.json(
          { error: 'Late check-out is not available for this property.' },
          { status: 400 }
        );
      }
      const allowedLate = lateCheckOutTimeOptions(
        checkInOutPolicy.checkOutTime,
        checkInOutPolicy.latestLateCheckOutTime
      );
      if (!requestedLate || !allowedLate.includes(requestedLate)) {
        return NextResponse.json(
          { error: 'Please select a valid late check-out time.' },
          { status: 400 }
        );
      }
    } else {
      requestedLate = null;
    }

    const { earlyFee, lateFee } = computeEarlyLateFees({
      policy: checkInOutPolicy,
      earlyRequested,
      lateRequested,
    });

    const cleaning = propertyRow.cleaning_fee != null ? Number(propertyRow.cleaning_fee) : 0;
    const serviceFeePercent = await getServiceFeePercent(serviceSupabase);
    const { grandTotal: expectedGrandTotal } = computeBookingGrandTotal({
      propertyNightlyPrice: Number(propertyRow.price) || 0,
      cleaningFee: cleaning,
      checkInYmd: String(check_in),
      checkOutYmd: String(check_out),
      selectedUnits: selected_units,
      wellnessLineItems: wellnessLineItemsSanitized,
      includedGuests: Number(propertyRow.guests) || 1,
      adults: Number(guests) || 1,
      kids: kids != null ? Number(kids) : 0,
      pets: pets != null ? Number(pets) : 0,
      allowExtraGuests: propertyRow.allow_extra_guests === true,
      extraGuestPrice:
        propertyRow.extra_guest_price != null ? Number(propertyRow.extra_guest_price) : 0,
      refundableDeposit:
        propertyRow.refundable_deposit != null ? Number(propertyRow.refundable_deposit) : 0,
      applyCardFee: propertyRow.allow_direct_booking === true,
      earlyCheckInFee: earlyFee,
      lateCheckOutFee: lateFee,
      feePercent: serviceFeePercent,
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
    let hostEmail = '';
    let hostName = 'Host';
    let hostAvatar = '';

    try {
      const { data: hostUser } = await serviceSupabase.auth.admin.getUserById(hostId);
      if (hostUser?.user) {
        hostEmail = hostUser.user.user_metadata?.host_email || hostUser.user.email || '';
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
        host_whatsapp: null,
        special_requests: special_requests || null,
        payment_status: 'pending',
        selected_units: selected_units || null,
        guest_agreement_accepted_at: new Date().toISOString(),
        guest_agreement_signer_name: signer,
        guest_agreement_document_url: propertyRow.guest_agreement_url || null,
        wellness_line_items:
          wellnessLineItemsSanitized.length > 0 ? wellnessLineItemsSanitized : [],
        early_check_in_requested: earlyRequested,
        requested_early_check_in_time: requestedEarly,
        late_check_out_requested: lateRequested,
        requested_late_check_out_time: requestedLate,
        cancellation_policy: normalizeCancellationPolicy(
          (propertyRow as { cancellation_policy?: string }).cancellation_policy
        ),
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
    let createdNewConversation = false;
    let initialChatPreview: string | null = null;
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
        createdNewConversation = Boolean(conversationId);
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

        initialChatPreview = requestSummary;

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
          const hostFeePercent = await getHostFeePercent(serviceSupabase);
          const payoutAmounts = computeHostPayoutAmounts({
            guestTotal: Number(total_price),
            checkIn: String(check_in),
            checkOut: String(check_out),
            hostNightlyRate: Number(propertyRow.price) || 0,
            hostCleaningFee: cleaning,
            feePercent: serviceFeePercent,
            hostFeePercent,
            booking: {
              guests: Number(guests) || 1,
              kids: kids != null ? Number(kids) : 0,
              pets: pets != null ? Number(pets) : 0,
              selected_units: Array.isArray(selected_units) ? selected_units : null,
              wellness_line_items: wellnessLineItemsSanitized,
              early_check_in_requested: earlyRequested,
              late_check_out_requested: lateRequested,
            },
            property: propertyRow as Record<string, unknown>,
          });
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
                hostFee: payoutAmounts.hostFee,
                hostFeePercent,
                hostPayout: payoutAmounts.hostAmount,
              },
            }),
          });
        } catch (emailError) {
          console.warn('Failed to send email notification:', emailError);
          // Don't fail the booking if email fails
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

    // Admin emails (best-effort, idempotent). Does not affect booking success.
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      void dispatchAdminNewBookingEmail({
        service: serviceSupabase,
        appUrl,
        bookingId: booking.id,
        propertyName: property_name,
        hostName,
        guestName: guest_name || 'Guest',
        checkIn: String(check_in),
        checkOut: String(check_out),
        guests: Number(guests) || 0,
        totalPrice: Number(total_price) || 0,
        status: String(booking.status || initialStatus),
        paymentStatus: booking.payment_status || 'pending',
      });

      if (createdNewConversation && conversationId) {
        const travellerName =
          guest_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.display_name ||
          user.email ||
          'Traveller';
        void dispatchAdminNewChatEmail({
          service: serviceSupabase,
          appUrl,
          conversationId,
          guestName: travellerName,
          hostName,
          propertyName: property_name,
          messagePreview: initialChatPreview || 'Booking request created',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (adminEmailErr) {
      console.warn('Failed to dispatch admin notification emails:', adminEmailErr);
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

