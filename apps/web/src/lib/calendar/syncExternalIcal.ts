import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256Hex } from '@/lib/calendar/icsHash';
import {
  inferCalendarSource,
  parseIcsStaysInWindow,
  formatYmdUtc,
} from '@/lib/calendar/icsParseIncoming';
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
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    const res = await fetch(calendar.ical_url, {
      headers: { 'User-Agent': 'VibesBNB-CalendarSync/2.0' },
      signal: ctl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`ICS HTTP ${res.status}`);
    }

    const body = await res.text();
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

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const slice = rows.slice(i, i + UPSERT_CHUNK);
      const { error: upErr } = await service.from('calendar_import_bookings').upsert(slice, {
        onConflict: 'external_calendar_id,external_id',
      });
      if (upErr) throw upErr;
    }

    const uidList = [...new Set(stays.map((s) => s.uid))];
    const { error: delErr } = await service.rpc('calendar_delete_import_orphans', {
      p_calendar_id: calendar.id,
      p_window_start: windowStartStr,
      p_window_end: windowEndStr,
      p_uids: uidList.length > 0 ? uidList : null,
    });
    if (delErr) throw delErr;

    const { error: refreshErr } = await service.rpc('calendar_refresh_ical_availability', {
      p_property: calendar.property_id,
      p_calendar: calendar.id,
      p_host: calendar.host_id,
      p_from: windowStartStr,
      p_to: windowEndStr,
    });
    if (refreshErr) throw refreshErr;

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
    const msg = e instanceof Error ? e.message : String(e);
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
