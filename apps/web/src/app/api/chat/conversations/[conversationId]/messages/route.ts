import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import {
  getContactBlockUserMessage,
  validateMessage,
} from '@/lib/utils/contactFilter';
import { dispatchPushToUser } from '@/lib/pushDispatch';
import { dispatchNewMessageNotification } from '@/lib/notifications/dispatchNewMessageNotification';

type BookingRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
};

async function conversationAllowsContactSharing(
  service: ReturnType<typeof createServiceClient>,
  conversation: {
    booking_id?: string | null;
    property_id?: string | null;
    host_id: string;
    traveller_id: string;
  }
): Promise<boolean> {
  const isUnlocked = (b: BookingRow | null | undefined) => {
    if (!b) return false;
    const status = String(b.status || '').toLowerCase();
    const payment = String(b.payment_status || '').toLowerCase();
    // Confirmed reservation (Airbnb-style) unlocks contact details
    return status === 'confirmed' || payment === 'paid';
  };

  if (conversation.booking_id) {
    const { data } = await service
      .from('bookings')
      .select('id, status, payment_status')
      .eq('id', conversation.booking_id)
      .maybeSingle();
    if (isUnlocked(data as BookingRow | null)) return true;
  }

  // Fallback: any confirmed booking between these parties for this property
  if (conversation.property_id) {
    const { data } = await service
      .from('bookings')
      .select('id, status, payment_status')
      .eq('property_id', conversation.property_id)
      .eq('host_id', conversation.host_id)
      .eq('user_id', conversation.traveller_id)
      .or('status.eq.confirmed,payment_status.eq.paid')
      .limit(1)
      .maybeSingle();
    if (isUnlocked(data as BookingRow | null)) return true;
  }

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const serviceSupabase = createServiceClient();

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    let user = null;
    let supabase;

    if (token) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    } else {
      supabase = createServerClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, host_id, traveller_id, booking_id, property_id')
      .eq('id', params.conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isParticipant =
      conversation.host_id === user.id || conversation.traveller_id === user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contactSharingAllowed = await conversationAllowsContactSharing(
      serviceSupabase,
      conversation
    );

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', params.conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const senderIds = Array.from(new Set((data || []).map((msg) => msg.sender_id)));
    const profiles: Record<string, { name: string; avatar: string }> = {};

    if (senderIds.length > 0) {
      const userResponses = await Promise.all(
        senderIds.map((id) => serviceSupabase.auth.admin.getUserById(id))
      );
      userResponses.forEach((response) => {
        const u = response.data?.user;
        if (u) {
          profiles[u.id] = {
            name:
              u.user_metadata?.full_name ||
              u.user_metadata?.display_name ||
              u.email ||
              'User',
            avatar:
              u.user_metadata?.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${u.email || u.id}`,
          };
        }
      });
    }

    const messagesWithProfiles = (data || []).map((msg) => ({
      ...msg,
      sender_profile: profiles[msg.sender_id] || null,
    }));

    return NextResponse.json({
      messages: messagesWithProfiles,
      contactSharingAllowed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const serviceSupabase = createServiceClient();

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    let user = null;
    let supabase;

    if (token) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    } else {
      supabase = createServerClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const message = body?.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      );
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(
        `
        id,
        property_id,
        host_id,
        traveller_id,
        booking_id,
        host_unread_count,
        traveller_unread_count,
        host_name,
        traveller_name,
        properties ( name )
      `
      )
      .eq('id', params.conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isHostSender = conversation.host_id === user.id;
    const isTravellerSender = conversation.traveller_id === user.id;

    if (!isHostSender && !isTravellerSender) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Pre-booking only: reject this message (not the whole chat). After confirmation, allow.
    const contactSharingAllowed = await conversationAllowsContactSharing(
      serviceSupabase,
      conversation
    );

    let containsContact = false;
    if (!contactSharingAllowed) {
      const validation = validateMessage(message, user.id);
      if (!validation.allowed) {
        const userMessage = getContactBlockUserMessage(validation.reason);
        return NextResponse.json(
          {
            error: userMessage,
            code: 'CONTACT_INFO_BLOCKED',
            reason: validation.reason || 'contact',
            conversationBlocked: false,
          },
          { status: 422 }
        );
      }
    } else {
      containsContact = !validateMessage(message, user.id).allowed;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        sender_id: user.id,
        body: message,
        contains_contact_info: containsContact,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const newHostUnread = isHostSender ? 0 : (conversation.host_unread_count || 0) + 1;
    const newTravellerUnread = isHostSender
      ? (conversation.traveller_unread_count || 0) + 1
      : 0;

    await supabase
      .from('conversations')
      .update({
        last_message: message,
        last_message_at: new Date().toISOString(),
        host_unread_count: newHostUnread,
        traveller_unread_count: newTravellerUnread,
      })
      .eq('id', params.conversationId);

    const recipientId = isHostSender ? conversation.traveller_id : conversation.host_id;

    const senderLabel = isHostSender
      ? conversation.host_name || 'Host'
      : conversation.traveller_name || 'Traveller';

    try {
      await serviceSupabase.from('notifications').insert({
        user_id: recipientId,
        type: 'new_message',
        title: 'New Message',
        message: `You have a new message from ${senderLabel}.`,
        related_booking_id: conversation.booking_id,
      });
    } catch (notificationError) {
      console.warn('Failed to create message notification:', notificationError);
    }

    await dispatchPushToUser(
      recipientId,
      'New message',
      `From ${senderLabel}: ${message.slice(0, 120)}`,
      {
        stage: 'new_message',
        bookingId: conversation.booking_id || undefined,
        conversationId: params.conversationId,
      }
    );

    const propertyName =
      (conversation.properties as { name?: string } | null)?.name || 'your property';
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || request.nextUrl.origin;

    void dispatchNewMessageNotification({
      service: serviceSupabase,
      recipientId,
      recipientIsHost: !isHostSender,
      senderLabel,
      propertyName,
      messagePreview: message,
      conversationId: params.conversationId,
      appUrl,
    });

    return NextResponse.json({ message: data, contactSharingAllowed });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
