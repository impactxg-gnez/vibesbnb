import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceSupabase = createServiceClient();
    const { data: conversations, error } = await serviceSupabase
      .from('conversations')
      .select(
        `
          id,
          property_id,
          host_id,
          traveller_id,
          booking_id,
          last_message,
          last_message_at,
          host_name,
          traveller_name,
          host_avatar,
          traveller_avatar,
          host_unread_count,
          traveller_unread_count,
          properties (
            name,
            location,
            images
          )
        `
      )
      .order('last_message_at', { ascending: false });

    if (error) {
      throw error;
    }

    const conversationIds = (conversations || []).map((c) => c.id);
    let messages: Record<string, any[]> = {};

    if (conversationIds.length > 0) {
      const { data: allMessages } = await serviceSupabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });

      allMessages?.forEach((msg) => {
        if (!messages[msg.conversation_id]) {
          messages[msg.conversation_id] = [];
        }
        messages[msg.conversation_id].push(msg);
      });
    }

    return NextResponse.json({
      conversations: (conversations || []).map((conv) => ({
        ...conv,
        messages: messages[conv.id] || [],
      })),
    });
  } catch (error: any) {
    console.error('Failed to load admin conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load conversations' },
      { status: 500 }
    );
  }
}


