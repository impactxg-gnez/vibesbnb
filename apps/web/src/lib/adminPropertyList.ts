import type { SupabaseClient } from '@supabase/supabase-js';
import { ADMIN_PROPERTY_LIST_COLUMNS } from '@/lib/adminPropertySelect';

export type AdminPropertyListRow = Record<string, unknown>;

function isMissingRpcError(error: { code?: string; message?: string }): boolean {
  const msg = error.message ?? '';
  return (
    error.code === '42883' ||
    error.code === 'PGRST202' ||
    msg.includes('admin_list_properties') ||
    msg.includes('Could not find the function')
  );
}

/** Fast path: DB RPC (SECURITY DEFINER, index-friendly). Fallback: slim PostgREST select. */
export async function fetchAdminPropertyList(
  supabase: SupabaseClient,
  opts: { status: string; limit: number; offset: number }
): Promise<AdminPropertyListRow[]> {
  const { data, error } = await supabase.rpc('admin_list_properties', {
    p_status: opts.status,
    p_limit: opts.limit,
    p_offset: opts.offset,
  });

  if (!error && Array.isArray(data)) {
    return data as AdminPropertyListRow[];
  }

  if (error && !isMissingRpcError(error)) {
    throw error;
  }

  const fallbackLimit = Math.min(opts.limit, 50);
  let query = supabase
    .from('properties')
    .select(ADMIN_PROPERTY_LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .range(opts.offset, opts.offset + fallbackLimit - 1);

  if (opts.status !== 'all') {
    query = query.eq('status', opts.status);
  }

  const { data: rows, error: queryError } = await query;
  if (queryError) throw queryError;
  return (rows ?? []) as unknown as AdminPropertyListRow[];
}
