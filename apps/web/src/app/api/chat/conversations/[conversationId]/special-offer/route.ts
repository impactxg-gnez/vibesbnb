import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import { dispatchPushToUser } from '@/lib/pushDispatch';
import { dispatchNewMessageNotification } from '@/lib/notifications/dispatchNewMessageNotification';
import { getHostFeePercent, getServiceFeePercent } from '@/lib/platformSettings';
import {
  encodeSpecialOfferMessage,
  fetchLatestSpecialOffer,
  previewSpecialOfferPayout,
  stayNightsFromDates,
  type SpecialOfferPayload,
} from '@/lib/specialOffer';

async function getAuthedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await supabase.auth.getUser(token);
    return { user: data.user, supabase };
  }
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  return { user: data.user, supabase };
}

/**
 * Host sends a discounted nightly rate to the guest. The payout preview is stored
 * in the message so both parties see the same numbers in the thread.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { user, supabase } = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, host_id, traveller_id, property_id, booking_id')
      .eq('id', params.conversationId)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (conversation.host_id !== user.id && conversation.traveller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const offer = await fetchLatestSpecialOffer(supabase, params.conversationId);
    return NextResponse.json({
      offer,
      propertyId: conversation.property_id,
      bookingId: conversation.booking_id,
    });
  } catch (error: unknown) {
    console.error('[special-offer GET]', error);
    const message = error instanceof Error ? error.message : 'Failed to load special offer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { user, supabase } = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const offerNightly = Number(body?.offerNightly);
    if (!Number.isFinite(offerNightly) || offerNightly < 1) {
      return NextResponse.json({ error: 'Enter a special-offer amount of at least $1.' }, { status: 400 });
    }

    const service = createServiceClient();
    const CONVERSATION_SELECT = `
        id,
        property_id,
        host_id,
        traveller_id,
        booking_id,
        inquiry_check_in,
        inquiry_check_out,
        host_unread_count,
        traveller_unread_count,
        host_name,
        traveller_name
      `;
    const CONVERSATION_SELECT_CORE = `
        id,
        property_id,
        host_id,
        traveller_id,
        booking_id,
        host_unread_count,
        traveller_unread_count,
        host_name,
        traveller_name
      `;

    let { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('id', params.conversationId)
      .single();

    if (
      conversationError &&
      (conversationError.code === '42703' ||
        /inquiry_check_in|inquiry_check_out/i.test(conversationError.message || ''))
    ) {
      const retry = await supabase
        .from('conversations')
        .select(CONVERSATION_SELECT_CORE)
        .eq('id', params.conversationId)
        .single();
      conversation = retry.data as typeof conversation;
      conversationError = retry.error;
    }

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can send a special offer for this stay.' },
        { status: 403 }
      );
    }

    const { data: propertyRow } = await service
      .from('properties')
      .select('name, price, cleaning_fee')
      .eq('id', conversation.property_id)
      .maybeSingle();
    const originalNightly = Math.max(0, Number(propertyRow?.price) || 0);
    if (!(originalNightly > 0)) {
      return NextResponse.json({ error: 'This listing has no nightly rate to discount.' }, { status: 400 });
    }
    if (offerNightly > originalNightly) {
      return NextResponse.json(
        { error: 'A special offer must be at or below the listed nightly rate.' },
        { status: 400 }
      );
    }

    const conv = conversation as {
      inquiry_check_in?: string | null;
      inquiry_check_out?: string | null;
      booking_id?: string | null;
    };
    let checkIn =
      typeof conv.inquiry_check_in === 'string' ? conv.inquiry_check_in.slice(0, 10) : null;
    let checkOut =
      typeof conv.inquiry_check_out === 'string' ? conv.inquiry_check_out.slice(0, 10) : null;

    if (conversation.booking_id) {
      const { data: booking } = await service
        .from('bookings')
        .select('check_in, check_out')
        .eq('id', conversation.booking_id)
        .maybeSingle();
      if (booking?.check_in) checkIn = String(booking.check_in).slice(0, 10);
      if (booking?.check_out) checkOut = String(booking.check_out).slice(0, 10);
    }

    const nights = stayNightsFromDates(checkIn, checkOut);
    const [serviceFeePercent, hostFeePercent] = await Promise.all([
      getServiceFeePercent(service),
      getHostFeePercent(service),
    ]);
    const payout = previewSpecialOfferPayout({
      offerNightly,
      nights,
      cleaningFee: Number(propertyRow?.cleaning_fee) || 0,
      serviceFeePercent,
      hostFeePercent,
    });
    const discountPercent = Math.round(
      ((originalNightly - offerNightly) / originalNightly) * 1000
    ) / 10;

    const payload: SpecialOfferPayload = {
      v: 1,
      originalNightly,
      offerNightly,
      discountPercent,
      nights,
      checkIn,
      checkOut,
      guestTotal: payout.guestTotal,
      lodgingGross: payout.lodgingGross,
      hostFee: payout.hostFee,
      hostAmount: payout.hostAmount,
      hostFeePercent,
    };
    const { body: messageBody, lastMessage } = encodeSpecialOfferMessage(payload);

    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        sender_id: user.id,
        body: messageBody,
        contains_contact_info: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await supabase
      .from('conversations')
      .update({
        last_message: lastMessage,
        last_message_at: new Date().toISOString(),
        host_unread_count: 0,
        traveller_unread_count: (conversation.traveller_unread_count || 0) + 1,
      })
      .eq('id', params.conversationId);

    if (conversation.booking_id) {
      const { error: bookingError } = await service
        .from('bookings')
        .update({
          special_offer_nightly: offerNightly,
          total_price: payout.guestTotal,
        })
        .eq('id', conversation.booking_id)
        .eq('host_id', user.id);
      if (bookingError && bookingError.code !== '42703' && bookingError.code !== 'PGRST204') {
        console.warn('[special-offer] booking update failed:', bookingError.message);
      }
    }

    const recipientId = conversation.traveller_id;
    const senderLabel = conversation.host_name || 'Host';
    const propertyName = propertyRow?.name || 'your stay';

    try {
      await service.from('notifications').insert({
        user_id: recipientId,
        type: 'new_message',
        title: 'Special offer',
        message: `${senderLabel} sent a special offer on ${propertyName}.`,
        related_booking_id: conversation.booking_id,
      });
    } catch (e) {
      console.warn('[special-offer] notification failed:', e);
    }

    await dispatchPushToUser(recipientId, 'Special offer', lastMessage, {
      stage: 'new_message',
      bookingId: conversation.booking_id || undefined,
      conversationId: params.conversationId,
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || request.nextUrl.origin;
    void dispatchNewMessageNotification({
      service,
      recipientId,
      recipientIsHost: false,
      senderLabel,
      propertyName,
      messagePreview: lastMessage,
      conversationId: params.conversationId,
      appUrl,
    });

    return NextResponse.json({ message, offer: payload });
  } catch (error: unknown) {
    console.error('[special-offer POST]', error);
    const message = error instanceof Error ? error.message : 'Failed to send special offer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
