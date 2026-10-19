import { createClient } from '@/lib/supabase/client';
import { requestUnreadMessagesRefresh } from '@/lib/chat/unreadMessageCount';

async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token || ''}`,
    ...(extra || {}),
  };
}

export async function hideConversation(
  conversationId: string,
  extraHeaders?: Record<string, string>
): Promise<void> {
  const response = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: await authHeaders(extraHeaders),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Could not remove this conversation');
  }
  requestUnreadMessagesRefresh();
}

export async function deleteOwnMessage(
  conversationId: string,
  messageId: string,
  extraHeaders?: Record<string, string>
): Promise<void> {
  const response = await fetch(
    `/api/chat/conversations/${conversationId}/messages?messageId=${encodeURIComponent(messageId)}`,
    {
      method: 'DELETE',
      headers: await authHeaders(extraHeaders),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Could not delete this message');
  }
}
