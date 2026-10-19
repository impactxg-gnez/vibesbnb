import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseForAdminApi } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

function accessTokenFromRequest(request: NextRequest): string {
  return request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const serviceSupabase = createSupabaseForAdminApi(accessTokenFromRequest(request));
    const selectedId = request.nextUrl.searchParams.get('conversationId')?.trim();

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
          inquiry_check_in,
          inquiry_check_out,
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

    const messagesByConversation: Record<string, any[]> = {};
    const idsToLoad = selectedId
      ? [selectedId]
      : (conversations || []).slice(0, 1).map((c) => c.id);

    if (idsToLoad.length > 0) {
      for (const conversationId of idsToLoad) {
        const { data: thread } = await serviceSupabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .range(0, 1999);
        messagesByConversation[conversationId] = thread || [];
      }
    }

    return NextResponse.json({
      conversations: (conversations || []).map((conv) => ({
        ...conv,
        messages: messagesByConversation[conv.id] || [],
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


