import type { User } from '@supabase/supabase-js';

/** Phone / WhatsApp from auth metadata (signup or profile save). */
export function phoneFromAuthMetadata(meta: Record<string, unknown> | undefined): string | null {
  const phone =
    typeof meta?.phone === 'string' ? meta.phone.trim() : '';
  const whatsapp =
    typeof meta?.whatsapp === 'string' ? meta.whatsapp.trim() : '';
  return phone || whatsapp || null;
}

export function profileContactPayloadFromAuthUser(user: User) {
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const phone = phoneFromAuthMetadata(meta);
  const whatsapp =
    typeof meta.whatsapp === 'string' && meta.whatsapp.trim()
      ? meta.whatsapp.trim()
      : phone;

  return {
    email: user.email ? user.email.toLowerCase().trim() : null,
    phone,
    whatsapp,
    host_email:
      typeof meta.host_email === 'string' && meta.host_email.trim()
        ? meta.host_email.trim()
        : null,
  };
}
