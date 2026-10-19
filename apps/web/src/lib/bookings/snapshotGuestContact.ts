import type { SupabaseClient } from '@supabase/supabase-js';
import { phoneFromAuthMetadata } from '@/lib/supabase/profileContactFromUser';

export type GuestContactSnapshot = {
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  guest_whatsapp: string | null;
};

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Immutable guest contact to store on the booking row (survives profile edits/deletes). */
export async function snapshotGuestContact(
  service: SupabaseClient,
  userId: string,
  fallback?: { name?: unknown; email?: unknown }
): Promise<GuestContactSnapshot> {
  const [{ data: profile }, { data: authData }] = await Promise.all([
    service
      .from('profiles')
      .select('email, phone, whatsapp, full_name')
      .eq('id', userId)
      .maybeSingle(),
    service.auth.admin.getUserById(userId),
  ]);

  const user = authData?.user;
  const meta = (user?.user_metadata || {}) as Record<string, unknown>;

  const guest_name =
    trimOrNull(fallback?.name) ||
    trimOrNull(profile?.full_name) ||
    trimOrNull(meta.full_name) ||
    trimOrNull(meta.display_name) ||
    trimOrNull(user?.email?.split('@')[0]) ||
    'Guest';

  const guest_email =
    trimOrNull(fallback?.email) ||
    trimOrNull(profile?.email) ||
    trimOrNull(user?.email) ||
    null;

  const guest_phone =
    trimOrNull(profile?.phone) ||
    phoneFromAuthMetadata(meta) ||
    trimOrNull(user?.phone) ||
    null;

  const guest_whatsapp = trimOrNull(profile?.whatsapp) || guest_phone;

  return { guest_name, guest_email, guest_phone, guest_whatsapp };
}
