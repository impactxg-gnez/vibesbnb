import type { SupabaseClient } from '@supabase/supabase-js';

export type ActiveAdmin = {
  id: string;
  email: string;
  name: string;
};

/**
 * Built-in default admin recipients who must always receive critical alerts.
 */
export const DEFAULT_ADMIN_EMAILS: string[] = [
  'vibewithdeon@vibesbnb.com',
  'keval65@gmail.com',
];

/**
 * Recipients for admin notifications (new booking, new chat enquiry, broken ical, payment confirmation).
 * Source of truth: Built-in defaults + env ADMIN_NOTIFICATION_EMAILS + admin_notification_emails DB table.
 */
export async function listActiveAdminRecipients(
  service?: SupabaseClient | null
): Promise<ActiveAdmin[]> {
  const out: ActiveAdmin[] = [];
  const seen = new Set<string>();

  // 1. Always seed with mandatory default admins
  for (const rawEmail of DEFAULT_ADMIN_EMAILS) {
    const email = rawEmail.trim().toLowerCase();
    if (email && !seen.has(email)) {
      seen.add(email);
      out.push({
        id: `default-${email}`,
        email,
        name: email.split('@')[0] || 'Admin',
      });
    }
  }

  // 2. Check environment variable override / extras
  const envAdmins = (process.env.ADMIN_NOTIFICATION_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const email of envAdmins) {
    if (!seen.has(email)) {
      seen.add(email);
      out.push({
        id: `env-${email}`,
        email,
        name: email.split('@')[0] || 'Admin',
      });
    }
  }

  // 3. Query DB table if service client is provided
  if (service) {
    try {
      const { data: rows, error } = await service
        .from('admin_notification_emails')
        .select('id, email, label, enabled')
        .eq('enabled', true);

      if (error) {
        console.warn('[listActiveAdminRecipients] DB query warning:', error.message);
      } else if (rows) {
        for (const row of rows) {
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
      }
    } catch (dbErr) {
      console.warn('[listActiveAdminRecipients] DB catch:', dbErr);
    }
  }

  return out;
}

export async function sendEmailViaExistingEndpoint(
  appUrl: string,
  payload: {
    to: string;
    cc?: string[];
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
