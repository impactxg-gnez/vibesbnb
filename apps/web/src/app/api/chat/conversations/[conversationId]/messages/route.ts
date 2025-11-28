import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

function containsContactInfo(message: string) {
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phoneRegex = /(\+?\d[\d\s().-]{7,})/;
  const urlRegex = /(https?:\/\/|www\.)/i;
  return (
    emailRegex.test(message) ||
    phoneRegex.test(message) ||
    urlRegex.test(message)
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = createClient();
    const serviceSupabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, host_id, traveller_id')
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

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', params.conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const senderIds = Array.from(new Set((data || []).map((msg) => msg.sender_id)));
    const profiles: Record<
      string,
      { name: string; avatar: string }
    > = {};

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

    return NextResponse.json({ messages: messagesWithProfiles });
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
    const supabase = createClient();
    const serviceSupabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    if (containsContactInfo(message)) {
      return NextResponse.json(
        {
          error:
            'Please keep communication on VibesBNB. Sharing phone numbers, emails, or links is not allowed.',
        },
        { status: 400 }
      );
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(
        'id, host_id, traveller_id, booking_id, host_unread_count, traveller_unread_count, host_name, traveller_name'
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

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        sender_id: user.id,
        body: message,
        contains_contact_info: false,
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
    const recipientName = isHostSender ? conversation.traveller_name : conversation.host_name;

    try {
      await serviceSupabase.from('notifications').insert({
        user_id: recipientId,
        type: 'new_message',
        title: 'New Message',
        message: `You have a new message from ${
          isHostSender
            ? conversation.host_name || 'Host'
            : conversation.traveller_name || 'Traveller'
        }.`,
        related_booking_id: conversation.booking_id,
      });
    } catch (notificationError) {
      console.warn('Failed to create message notification:', notificationError);
    }

    return NextResponse.json({ message: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

