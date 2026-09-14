import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PROPERTY_DETAIL_CORE_COLUMNS,
  PROPERTY_DETAIL_OPTIONAL_COLUMNS,
} from '@/lib/propertyPublicSelect';

type PgLikeError = { code?: string; message?: string } | null;

export function isUndefinedColumnError(error: PgLikeError): boolean {
  const message = error?.message ?? '';
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    /column .* does not exist/i.test(message)
  );
}

/**
 * Listing detail row, including columns whose migration may not have run yet. A pending
 * migration must not turn the listing page into "Property not found", so the optional
 * columns are dropped and the read retried.
 */
export async function fetchPropertyDetailRow(
  supabase: SupabaseClient,
  propertyId: string,
  opts?: { activeOnly?: boolean }
): Promise<{ data: Record<string, unknown> | null; error: PgLikeError }> {
  const attempt = async (columns: string) => {
    let query = supabase.from('properties').select(columns).eq('id', propertyId);
    if (opts?.activeOnly !== false) query = query.eq('status', 'active');
    const { data, error } = await query.single();
    return { data: (data as Record<string, unknown> | null) ?? null, error: error as PgLikeError };
  };

  const withOptional = await attempt(PROPERTY_DETAIL_OPTIONAL_COLUMNS);
  if (!withOptional.error || !isUndefinedColumnError(withOptional.error)) {
    return withOptional;
  }
  return attempt(PROPERTY_DETAIL_CORE_COLUMNS);
}
