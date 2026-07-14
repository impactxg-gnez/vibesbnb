import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveUserContact } from '@/lib/notifications/resolveUserContact';

export type NewMessageNotificationParams = {
  service: SupabaseClient;
  recipientId: string;
  recipientIsHost: boolean;
  senderLabel: string;
  propertyName: string;
  messagePreview: string;
  conversationId: string;
  appUrl: string;
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Email when someone receives a new in-app message.
 * Failures are logged only; does not throw.
 * WhatsApp delivery is deferred until a non-Twilio provider is wired.
 */
export async function dispatchNewMessageNotification(
  params: NewMessageNotificationParams
): Promise<void> {
  const {
    service,
    recipientId,
    recipientIsHost,
    senderLabel,
    propertyName,
    messagePreview,
    conversationId,
    appUrl,
  } = params;

  try {
    const contact = await resolveUserContact(service, recipientId);
    const preview = truncate(messagePreview, 200);
    const inboxPath = recipientIsHost
      ? `/host/messages?conversationId=${encodeURIComponent(conversationId)}`
      : `/messages?conversationId=${encodeURIComponent(conversationId)}`;
    const inboxUrl = `${appUrl.replace(/\/$/, '')}${inboxPath}`;
    const subject = `New message from ${senderLabel} — ${propertyName}`;

    if (contact.email) {
      try {
        await fetch(`${appUrl}/api/notifications/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: contact.email,
            subject,
            template: 'new_message',
            data: {
              senderName: senderLabel,
              propertyName,
              messagePreview: preview,
              inboxUrl,
              recipientName: contact.name,
            },
          }),
        });
      } catch (e) {
        console.warn('[dispatchNewMessageNotification] email failed:', e);
      }
    }
  } catch (e) {
    console.warn('[dispatchNewMessageNotification]', e);
  }
}

export { escapeHtml, truncate };
