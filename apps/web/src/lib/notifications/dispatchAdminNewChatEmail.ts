import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listActiveAdminRecipients,
  sendEmailViaExistingEndpoint,
} from '@/lib/notifications/listActiveAdmins';

export type AdminNewChatEmailParams = {
  service: SupabaseClient;
  appUrl: string;
  conversationId: string;
  guestName: string;
  hostName?: string | null;
  propertyName?: string | null;
  messagePreview?: string | null;
  createdAt?: string | null;
};

/**
 * Emails all active admins when a NEW conversation/thread is created (once).
 * Must not be called for subsequent messages on an existing thread.
 * Best-effort; never throws to callers.
 */
export async function dispatchAdminNewChatEmail(
  params: AdminNewChatEmailParams
): Promise<void> {
  try {
    const {
      service,
      appUrl,
      conversationId,
      guestName,
      hostName,
      propertyName,
      messagePreview,
      createdAt,
    } = params;

    const { data: claimed, error: claimErr } = await service
      .from('conversations')
      .update({ admin_new_chat_emailed_at: new Date().toISOString() })
      .eq('id', conversationId)
      .is('admin_new_chat_emailed_at', null)
      .select('id');

    if (claimErr) {
      console.warn('[dispatchAdminNewChatEmail] claim:', claimErr.message);
      return;
    }
    if (!claimed?.length) {
      return;
    }

    const admins = await listActiveAdminRecipients(service);
    if (admins.length === 0) {
      console.warn('[dispatchAdminNewChatEmail] no active admin recipients');
      return;
    }

    const base = appUrl.replace(/\/$/, '');
    const adminChatUrl = `${base}/admin/messages?conversationId=${encodeURIComponent(conversationId)}`;
    const preview = (messagePreview || 'Conversation started').trim().slice(0, 280);
    const subject = `New chat — ${propertyName || guestName || 'conversation'}`;

    await Promise.all(
      admins.map((admin) =>
        sendEmailViaExistingEndpoint(base, {
          to: admin.email,
          subject,
          template: 'admin_new_chat',
          data: {
            conversationId,
            guestName: guestName || 'Guest',
            hostName: hostName || 'Host',
            propertyName: propertyName || 'Listing',
            messagePreview: preview,
            createdAt: createdAt || new Date().toISOString(),
            adminChatUrl,
            recipientName: admin.name,
          },
        })
      )
    );
  } catch (e) {
    console.warn('[dispatchAdminNewChatEmail]', e);
  }
}
