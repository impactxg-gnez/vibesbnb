import type { SupabaseClient } from '@supabase/supabase-js';

export type ActiveAdmin = {
  id: string;
  email: string;
  name: string;
};

/**
 * Recipients for admin_new_booking / admin_new_chat.
 * Source of truth: admin_notification_emails (managed in Admin panel).
 */
export async function listActiveAdminRecipients(
  service: SupabaseClient
): Promise<ActiveAdmin[]> {
  const { data: rows, error } = await service
    .from('admin_notification_emails')
    .select('id, email, label, enabled')
    .eq('enabled', true);

  if (error) {
    console.warn('[listActiveAdminRecipients]', error.message);
    return [];
  }

  const out: ActiveAdmin[] = [];
  const seen = new Set<string>();

  for (const row of rows || []) {
    const email = String(row.email || '')
      .trim()
      .toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({
      id: String(row.id),
      email,
      name: (typeof row.label === 'string' && row.label.trim()) || email.split('@')[0] || 'Admin',
    });
  }

  return out;
}

export async function sendEmailViaExistingEndpoint(
  appUrl: string,
  payload: {
    to: string;
    subject: string;
    template: string;
    data: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const response = await fetch(`${appUrl.replace(/\/$/, '')}/api/notifications/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn('[sendEmailViaExistingEndpoint]', payload.template, err);
    }
  } catch (e) {
    console.warn('[sendEmailViaExistingEndpoint] failed:', payload.template, e);
  }
}
