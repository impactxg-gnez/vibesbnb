import type { SupabaseClient } from '@supabase/supabase-js';
import { phoneFromAuthMetadata } from '@/lib/supabase/profileContactFromUser';

export type UserContact = {
  email: string | null;
  whatsapp: string | null;
  name: string;
};

/** Email and WhatsApp/phone for outbound notifications (auth + profiles). */
export async function resolveUserContact(
  service: SupabaseClient,
  userId: string
): Promise<UserContact> {
  const [{ data: profile }, { data: authData }] = await Promise.all([
    service
      .from('profiles')
      .select('email, phone, whatsapp, host_email, full_name')
      .eq('id', userId)
      .maybeSingle(),
    service.auth.admin.getUserById(userId),
  ]);

  const user = authData?.user;
  const meta = (user?.user_metadata || {}) as Record<string, unknown>;

  const email =
    (typeof profile?.email === 'string' && profile.email.trim()) ||
    (typeof profile?.host_email === 'string' && profile.host_email.trim()) ||
    (typeof meta.host_email === 'string' && meta.host_email.trim()) ||
    user?.email?.trim() ||
    null;

  const whatsapp =
    (typeof profile?.whatsapp === 'string' && profile.whatsapp.trim()) ||
    (typeof profile?.phone === 'string' && profile.phone.trim()) ||
    phoneFromAuthMetadata(meta) ||
    null;

  const name =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    user?.email?.split('@')[0] ||
    'User';

  return { email, whatsapp, name };
}

/** Normalize to E.164-ish for messaging providers (digits with leading +). */
export function normalizeWhatsAppNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    const rest = digits.slice(1).replace(/\D/g, '');
    return rest.length >= 8 ? `+${rest}` : null;
  }
  const onlyDigits = digits.replace(/\D/g, '');
  if (onlyDigits.length === 10) return `+1${onlyDigits}`;
  if (onlyDigits.length >= 8) return `+${onlyDigits}`;
  return null;
}
