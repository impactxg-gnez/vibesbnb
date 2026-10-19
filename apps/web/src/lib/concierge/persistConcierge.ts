import { isUndefinedColumnError } from '@/lib/propertyDetailFetch';
import { createServiceClient } from '@/lib/supabase/service';
import type { ConciergeChatSummary, StayCard } from '@/lib/concierge/types';

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  const message = error?.message ?? '';
  return error?.code === '42P01' || /relation .* does not exist/i.test(message);
}

export async function persistConciergeTurn(params: {
  userId: string;
  role: 'user' | 'assistant';
  body: string;
  listings?: StayCard[];
  conversationId?: string | null;
}): Promise<string | null> {
  const service = createServiceClient();
  const now = new Date().toISOString();
  let conversationId = params.conversationId?.trim() || null;

  if (conversationId) {
    const owned = await service
      .from('vibe_bot_chats')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', params.userId)
      .maybeSingle();
    if (owned.error && !isMissingRelation(owned.error) && !isUndefinedColumnError(owned.error)) {
      console.warn('[concierge] chat lookup', owned.error);
    }
    if (!owned.data) conversationId = null;
  }

  if (!conversationId) {
    const inserted = await service
      .from('vibe_bot_chats')
      .insert({
        user_id: params.userId,
        title: params.role === 'user' ? params.body.slice(0, 80) : 'New chat',
        last_message: params.body.slice(0, 280),
        last_message_at: now,
      })
      .select('id')
      .maybeSingle();
    if (inserted.data?.id) {
      conversationId = String(inserted.data.id);
    } else if (inserted.error && !isMissingRelation(inserted.error) && !isUndefinedColumnError(inserted.error)) {
      console.warn('[concierge] chat insert', inserted.error);
    }
  } else {
    await service
      .from('vibe_bot_chats')
      .update({
        last_message: params.body.slice(0, 280),
        last_message_at: now,
      })
      .eq('id', conversationId)
      .eq('user_id', params.userId);
  }

  const row: Record<string, unknown> = {
    user_id: params.userId,
    role: params.role,
    body: params.body,
    listings: params.listings || null,
  };
  if (conversationId) row.conversation_id = conversationId;

  const insertedMsg = await service.from('vibe_bot_messages').insert(row);
  if (insertedMsg.error && isUndefinedColumnError(insertedMsg.error) && conversationId) {
    await service.from('vibe_bot_messages').insert({
      user_id: params.userId,
      role: params.role,
      body: params.body,
      listings: params.listings || null,
    });
  } else if (insertedMsg.error) {
    console.warn('[concierge] message insert', insertedMsg.error);
  }

  await service.from('vibe_bot_threads').upsert({
    user_id: params.userId,
    last_message: params.body.slice(0, 280),
    last_message_at: now,
  });

  return conversationId;
}

export async function listConciergeChats(userId: string): Promise<ConciergeChatSummary[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('vibe_bot_chats')
    .select('id, title, last_message, last_message_at')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(40);

  if (error) {
    if (isMissingRelation(error) || isUndefinedColumnError(error)) return [];
    throw error;
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    title: String(row.title || 'Chat').trim() || 'Chat',
    lastMessage: String(row.last_message || ''),
    lastMessageAt: String(row.last_message_at || ''),
  }));
}
