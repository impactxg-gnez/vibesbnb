import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

/** Maps auth metadata role to profiles.role (defaults traveller). */
function profileRoleFromMetadata(role: unknown): string {
  if (role === 'host' || role === 'host_pending') return 'host';
  if (role === 'admin') return 'admin';
  if (role === 'dispensary') return 'dispensary';
  return 'traveller';
}

/**
 * Upserts `profiles` from the auth user using the service role (bypasses RLS).
 * Safe to call on every OAuth / email-confirm callback.
 * Promotes legacy `host_pending` → `host` in Auth metadata (no manual admin approval).
 */
export async function syncProfileFromAuthUser(user: User | null | undefined) {
  if (!user?.id) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl === 'https://placeholder.supabase.co') {
    return;
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const meta: Record<string, unknown> = { ...(user.user_metadata || {}) };

  if (meta.role === 'host_pending') {
    const { error: promoteErr } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...meta, role: 'host' },
    });
    if (promoteErr) {
      console.warn('[syncProfileFromAuthUser] promote host_pending:', promoteErr.message);
    } else {
      meta.role = 'host';
    }
  }

  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  const role = profileRoleFromMetadata(meta.role);

  const { error } = await admin.from('profiles').upsert(
    {
      id: user.id,
      full_name: fullName || null,
      role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('[syncProfileFromAuthUser] profiles upsert:', error.message);
  }
}
