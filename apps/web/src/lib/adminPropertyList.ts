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

function firstImageUrl(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  return typeof first === 'string' && first.trim() ? first.trim() : null;
}

/** Attach a single cover URL without shipping full image arrays to the client. */
async function withCoverImages(
  supabase: SupabaseClient,
  rows: AdminPropertyListRow[]
): Promise<AdminPropertyListRow[]> {
  if (rows.length === 0) return rows;

  // New RPC returns cover_image (may be null). Skip a second round-trip when present.
  if (rows.some((row) => 'cover_image' in row)) {
    return rows.map((row) => {
      const cover =
        typeof row.cover_image === 'string' && row.cover_image.trim()
          ? row.cover_image.trim()
          : null;
      return {
        ...row,
        cover_image: cover,
        images:
          Array.isArray(row.images) && row.images.length > 0
            ? row.images
            : cover
              ? [cover]
              : [],
      };
    });
  }

  const ids = rows
    .map((row) => (typeof row.id === 'string' ? row.id : null))
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return rows;

  const { data: mediaRows, error } = await supabase
    .from('properties')
    .select('id, images')
    .in('id', ids);

  if (error || !mediaRows) {
    console.warn('[adminPropertyList] cover image enrichment failed:', error?.message);
    return rows;
  }

  const coverById = new Map<string, string | null>();
  for (const media of mediaRows as Array<{ id: string; images: unknown }>) {
    coverById.set(media.id, firstImageUrl(media.images));
  }

  return rows.map((row) => {
    const id = typeof row.id === 'string' ? row.id : '';
    const cover =
      (typeof row.cover_image === 'string' && row.cover_image) || coverById.get(id) || null;
    return {
      ...row,
      cover_image: cover,
      // UI still reads images[0]; keep a one-item array only.
      images: cover ? [cover] : [],
    };
  });
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
    return withCoverImages(supabase, data as AdminPropertyListRow[]);
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
  return withCoverImages(supabase, (rows ?? []) as unknown as AdminPropertyListRow[]);
}
