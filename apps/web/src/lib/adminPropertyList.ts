import type { SupabaseClient } from '@supabase/supabase-js';
import { ADMIN_PROPERTY_LIST_COLUMNS } from '@/lib/adminPropertySelect';

export type AdminPropertyListRow = Record<string, unknown>;

type PgLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

/** Core columns guaranteed by SUPABASE_00_SCHEMA_BOOTSTRAP.sql on every deployment. */
const ADMIN_PROPERTY_LIST_CORE_COLUMNS = 'id,name,title,location,price,rating,status,created_at';

/** Postgres/PostgREST "column does not exist" — schema drift between environments. */
function isUndefinedColumnError(error: PgLikeError): boolean {
  const msg = error.message ?? '';
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column .* does not exist/i.test(msg)
  );
}

/** Flatten a Supabase error into a message that keeps the SQLSTATE and details. */
export function describeAdminListError(error: PgLikeError): string {
  const parts = [error.message?.trim() || 'Failed to load properties'];
  if (error.code) parts.push(`[${error.code}]`);
  if (error.details) parts.push(String(error.details).trim());
  if (error.hint) parts.push(String(error.hint).trim());
  return parts.filter(Boolean).join(' ');
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

/** Slim PostgREST select used whenever the RPC is unavailable or fails. */
async function selectPropertyList(
  supabase: SupabaseClient,
  columns: string,
  opts: { status: string; limit: number; offset: number }
) {
  const fallbackLimit = Math.min(opts.limit, 50);
  let query = supabase
    .from('properties')
    .select(columns)
    .order('created_at', { ascending: false })
    .range(opts.offset, opts.offset + fallbackLimit - 1);

  if (opts.status !== 'all') {
    query = query.eq('status', opts.status);
  }

  return query;
}

/**
 * Fast path: DB RPC (SECURITY DEFINER, index-friendly).
 * Any RPC failure (missing function, missing grant, result-type drift) degrades to a slim
 * PostgREST select so the admin grid keeps working, and a missing optional column degrades
 * again to core columns only. Only a total failure surfaces as an error.
 */
export async function fetchAdminPropertyList(
  supabase: SupabaseClient,
  opts: { status: string; limit: number; offset: number }
): Promise<AdminPropertyListRow[]> {
  const { data, error: rpcError } = await supabase.rpc('admin_list_properties', {
    p_status: opts.status,
    p_limit: opts.limit,
    p_offset: opts.offset,
  });

  if (!rpcError && Array.isArray(data)) {
    return withCoverImages(supabase, data as AdminPropertyListRow[]);
  }

  if (rpcError) {
    console.warn(
      '[adminPropertyList] admin_list_properties RPC unavailable, using PostgREST fallback:',
      describeAdminListError(rpcError)
    );
  }

  const { data: rows, error: queryError } = await selectPropertyList(
    supabase,
    ADMIN_PROPERTY_LIST_COLUMNS,
    opts
  );

  if (!queryError) {
    return withCoverImages(supabase, (rows ?? []) as unknown as AdminPropertyListRow[]);
  }

  if (!isUndefinedColumnError(queryError)) {
    throw new Error(describeAdminListError(queryError));
  }

  console.warn(
    '[adminPropertyList] optional column missing, retrying with core columns:',
    describeAdminListError(queryError)
  );

  const { data: coreRows, error: coreError } = await selectPropertyList(
    supabase,
    ADMIN_PROPERTY_LIST_CORE_COLUMNS,
    opts
  );

  if (coreError) {
    throw new Error(describeAdminListError(coreError));
  }

  return withCoverImages(supabase, (coreRows ?? []) as unknown as AdminPropertyListRow[]);
}
