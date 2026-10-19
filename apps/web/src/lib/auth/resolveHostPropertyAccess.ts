import type { User, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isAdminUser } from '@/lib/auth/isAdmin';

export type PropertyHostRow = {
  id: string;
  host_id: string;
  price?: number | null;
};

/**
 * Resolve property ownership for host APIs.
 * Admins may act on any listing; writes use the service role so RLS cannot block them.
 */
export async function resolveHostPropertyAccess(propertyId: string): Promise<
  | { ok: true; user: User; property: PropertyHostRow; db: SupabaseClient; isAdmin: boolean }
  | { ok: false; status: number; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const isAdmin = isAdminUser(user);
  // Service role can read drafts even when public SELECT is limited to status=active.
  const reader = createServiceClient();

  const { data: property, error } = await reader
    .from('properties')
    .select('id, host_id, price')
    .eq('id', propertyId)
    .maybeSingle();

  if (error || !property) {
    return { ok: false, status: 404, error: 'Property not found' };
  }

  if (!isAdmin && property.host_id !== user.id) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return {
    ok: true,
    user,
    property: property as PropertyHostRow,
    // Writes use service role so draft listings are not blocked by SELECT/UPDATE RLS.
    db: reader,
    isAdmin,
  };
}
