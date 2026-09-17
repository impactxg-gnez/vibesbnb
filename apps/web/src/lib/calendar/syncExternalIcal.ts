import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256Hex } from '@/lib/calendar/icsHash';
import {
  inferCalendarSource,
  parseIcsStaysInWindow,
  formatYmdUtc,
  type ParsedIcsStay,
} from '@/lib/calendar/icsParseIncoming';
import { fetchIcsBody } from '@/lib/calendar/icsFetch';
import {
  formatUnknownError,
  isMissingRelationOrFunction,
  isUniqueViolation,
} from '@/lib/calendar/icsError';
import { getRedis } from '@/lib/cache/redis';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

const UPSERT_CHUNK = 200;

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addMonthsUtc(d: Date, months: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
}

export async function syncOnePropertyIcalSource(opts: {
  service: SupabaseClient;
  calendar: {
    id: string;
    property_id: string;
    host_id: string;
    ical_url: string;
    last_hash: string | null;
    name?: string | null;
  };
  /** Bypass hash shortcut (manual sync only). */
  force?: boolean;
}): Promise<{ skipped: boolean; events: number; error?: string; dedupeLock?: boolean }> {
  const { service, calendar, force } = opts;
  const windowStart = startOfUtcDay();
  const windowEndExclusive = addMonthsUtc(windowStart, 6);
  const windowStartStr = formatYmdUtc(windowStart);
  const windowEndStr = formatYmdUtc(windowEndExclusive);

  const sourceTag = inferCalendarSource(calendar.ical_url, calendar.name ?? undefined);
  const redis = getRedis();
  let lockHeld = false;

  try {
    const body = await fetchIcsBody(calendar.ical_url);
    const hash = await sha256Hex(body);

    if (!force && calendar.last_hash && calendar.last_hash === hash) {
      return { skipped: true, events: 0 };
    }

    if (redis) {
      const acquired = await redis.set(`cal:lock:v1:${calendar.id}`, '1', { nx: true, ex: 180 });
      if (!acquired) {
        return { skipped: true, events: 0, dedupeLock: true };
      }
      lockHeld = true;
    }

    const stays = parseIcsStaysInWindow(body, windowStart, windowEndExclusive, `${calendar.id}:`);

    const rows = stays.map((s) => ({
      property_id: calendar.property_id,
      external_calendar_id: calendar.id,
      start_date: s.startInclusive,
      end_date: s.endExclusive,
      source: sourceTag,
      external_id: s.uid,
    }));

    let wroteImportBookings = false;
    try {
      for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
        const slice = rows.slice(i, i + UPSERT_CHUNK);
        const { error: upErr } = await service.from('calendar_import_bookings').upsert(slice, {
          onConflict: 'external_calendar_id,external_id',
        });
        if (upErr) throw upErr;
      }
      wroteImportBookings = true;

      const uidList = [...new Set(stays.map((s) => s.uid))];
      const { error: delErr } = await service.rpc('calendar_delete_import_orphans', {
        p_calendar_id: calendar.id,
        p_window_start: windowStartStr,
        p_window_end: windowEndStr,
        p_uids: uidList.length > 0 ? uidList : null,
      });
      if (delErr && !isMissingRelationOrFunction(formatUnknownError(delErr))) {
        throw delErr;
      }
    } catch (importErr) {
      const importMsg = formatUnknownError(importErr);
      if (!isMissingRelationOrFunction(importMsg)) throw importErr;
    }

    const { error: refreshErr } = wroteImportBookings
      ? await service.rpc('calendar_refresh_ical_availability', {
          p_property: calendar.property_id,
          p_calendar: calendar.id,
          p_host: calendar.host_id,
          p_from: windowStartStr,
          p_to: windowEndStr,
        })
      : { error: { message: 'calendar_refresh_ical_availability skipped' } };

    if (refreshErr) {
      const refreshMsg = formatUnknownError(refreshErr);
      if (
        wroteImportBookings &&
        !isUniqueViolation(refreshErr, refreshMsg) &&
        !isMissingRelationOrFunction(refreshMsg)
      ) {
        throw refreshErr;
      }
      await refreshIcalAvailabilityClientSide(service, {
        propertyId: calendar.property_id,
        hostId: calendar.host_id,
        calendarId: calendar.id,
        windowStartStr,
        windowEndStr,
        stays,
      });
    }

    const { error: metaErr } = await service
      .from('property_ical_sources')
      .update({
        last_hash: hash,
        last_synced_at: new Date().toISOString(),
        sync_status: 'active',
        sync_error: null,
      })
      .eq('id', calendar.id);

    if (metaErr) throw metaErr;

    void invalidatePropertyListingCaches(calendar.property_id);

    return { skipped: false, events: stays.length };
  } catch (e: unknown) {
    const msg = formatUnknownError(e);
    await service
      .from('property_ical_sources')
      .update({
        sync_status: 'failed',
        sync_error: msg.slice(0, 500),
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', calendar.id);
    return { skipped: false, events: 0, error: msg };
  } finally {
    if (lockHeld && redis) {
      await redis.del(`cal:lock:v1:${calendar.id}`);
    }
  }
}

function addDaysYmd(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatYmdUtc(dt);
}

function nightsInStay(startInclusive: string, endExclusive: string): string[] {
  const nights: string[] = [];
  for (let cursor = startInclusive; cursor < endExclusive; cursor = addDaysYmd(cursor, 1)) {
    nights.push(cursor);
  }
  return nights;
}

async function refreshIcalAvailabilityClientSide(
  service: SupabaseClient,
  opts: {
    propertyId: string;
    hostId: string;
    calendarId: string;
    windowStartStr: string;
    windowEndStr: string;
    stays: ParsedIcsStay[];
  }
) {
  const desired = new Set<string>();
  for (const stay of opts.stays) {
    for (const night of nightsInStay(stay.startInclusive, stay.endExclusive)) {
      if (night >= opts.windowStartStr && night < opts.windowEndStr) desired.add(night);
    }
  }

  await service
    .from('property_availability')
    .delete()
    .eq('property_id', opts.propertyId)
    .eq('ical_source_id', opts.calendarId)
    .eq('source', 'ical_sync')
    .is('room_id', null)
    .gte('day', opts.windowStartStr)
    .lt('day', opts.windowEndStr);

  if (desired.size === 0) return;

  const { data: existing, error: existingErr } = await service
    .from('property_availability')
    .select('day')
    .eq('property_id', opts.propertyId)
    .is('room_id', null)
    .in('day', [...desired]);
  if (existingErr) throw existingErr;

  const taken = new Set((existing || []).map((row) => row.day));
  const inserts = [...desired]
    .filter((day) => !taken.has(day))
    .map((day) => ({
      property_id: opts.propertyId,
      host_id: opts.hostId,
      day,
      status: 'blocked',
      source: 'ical_sync',
      ical_source_id: opts.calendarId,
      note: 'External calendar',
      room_id: null,
    }));

  for (let i = 0; i < inserts.length; i += UPSERT_CHUNK) {
    const slice = inserts.slice(i, i + UPSERT_CHUNK);
    const { error: insErr } = await service.from('property_availability').insert(slice);
    if (insErr) throw insErr;
  }
}

export async function fetchIcalSourcesByIds(
  service: SupabaseClient,
  ids: string[]
): Promise<
  Array<{
    id: string;
    property_id: string;
    host_id: string;
    ical_url: string;
    last_hash: string | null;
    name: string | null;
  }>
> {
  const unique = [...new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))];
  if (unique.length === 0) return [];

  const { data, error } = await service
    .from('property_ical_sources')
    .select('id,property_id,host_id,ical_url,last_hash,name')
    .in('id', unique)
    .eq('is_active', true);

  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    property_id: r.property_id,
    host_id: r.host_id,
    ical_url: r.ical_url,
    last_hash: r.last_hash,
    name: r.name,
  }));
}

export async function pickIcalSourcesBatch(
  service: SupabaseClient,
  limit = 50
): Promise<
  Array<{
    id: string;
    property_id: string;
    host_id: string;
    ical_url: string;
    last_hash: string | null;
    name: string | null;
  }>
> {
  const { data: failed, error: fErr } = await service
    .from('property_ical_sources')
    .select('id,property_id,host_id,ical_url,last_hash,name,sync_status,last_synced_at')
    .eq('is_active', true)
    .eq('sync_status', 'failed')
    .order('last_synced_at', { ascending: true })
    .limit(limit);

  if (fErr) throw fErr;

  const picked = [...(failed || [])];
  const need = Math.max(0, limit - picked.length);

  if (need > 0) {
    const { data: healthy, error: hErr } = await service
      .from('property_ical_sources')
      .select('id,property_id,host_id,ical_url,last_hash,name,sync_status,last_synced_at')
      .eq('is_active', true)
      .eq('sync_status', 'active')
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(need);

    if (hErr) throw hErr;
    picked.push(...(healthy || []));
  }

  return picked.map((r) => ({
    id: r.id,
    property_id: r.property_id,
    host_id: r.host_id,
    ical_url: r.ical_url,
    last_hash: r.last_hash,
    name: r.name,
  }));
}

export { startOfUtcDay, addMonthsUtc };
