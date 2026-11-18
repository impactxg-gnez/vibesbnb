import type { SupabaseClient } from '@supabase/supabase-js';
import { dispatchBrokenIcalEmail } from '@/lib/notifications/dispatchBrokenIcalEmail';

export type IcalHealthCheckResult = {
  checked: number;
  healthy: number;
  broken: number;
  alertsSent: number;
  details: Array<{
    id: string;
    propertyName: string;
    calendarName: string;
    url: string;
    status: 'healthy' | 'broken';
    error?: string;
    alertSent?: boolean;
  }>;
};

/**
 * Validates whether an external URL returns a valid iCalendar (ICS) payload.
 */
export async function testIcalUrl(url: string, timeoutMs = 15000): Promise<{ ok: boolean; error?: string }> {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, error: 'Invalid URL protocol. Must be http or https.' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'VibesBNB-CalendarHealth/1.0 (+https://vibesbnb.com)',
        Accept: 'text/calendar, text/plain, */*',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText || 'Unable to fetch calendar'}` };
    }

    const text = await res.text();
    if (!text || !text.includes('BEGIN:VCALENDAR')) {
      return {
        ok: false,
        error: 'Response is not a valid iCalendar feed (missing BEGIN:VCALENDAR).',
      };
    }

    return { ok: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: `Connection timed out after ${timeoutMs / 1000}s.` };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Network error: ${msg}` };
  }
}

/**
 * Backend service that scans external iCal sources, tests each URL,
 * updates the database state, and emails hosts and admins for any broken links.
 */
export async function checkBrokenIcalLinks(
  service: SupabaseClient,
  appUrl: string,
  opts?: { calendarId?: string; propertyId?: string }
): Promise<IcalHealthCheckResult> {
  let query = service
    .from('property_ical_sources')
    .select(`
      id,
      property_id,
      host_id,
      name,
      ical_url,
      sync_status,
      sync_error,
      last_synced_at,
      properties (
        id,
        name,
        title
      )
    `)
    .eq('is_active', true);

  if (opts?.calendarId) {
    query = query.eq('id', opts.calendarId);
  }
  if (opts?.propertyId) {
    query = query.eq('property_id', opts.propertyId);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error('[checkBrokenIcalLinks] Query error:', error);
    throw error;
  }

  const results: IcalHealthCheckResult = {
    checked: rows?.length || 0,
    healthy: 0,
    broken: 0,
    alertsSent: 0,
    details: [],
  };

  if (!rows || rows.length === 0) {
    return results;
  }

  for (const row of rows) {
    const rawProp = row.properties as unknown as { name?: string; title?: string } | null;
    const propertyName = rawProp?.name || rawProp?.title || 'Property';
    const calendarName = row.name || 'External Calendar';
    const check = await testIcalUrl(row.ical_url);

    if (check.ok) {
      results.healthy++;
      // If it was previously marked failed, clear it
      if (row.sync_status === 'failed' || row.sync_error) {
        await service
          .from('property_ical_sources')
          .update({
            sync_status: 'active',
            sync_error: null,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', row.id);
      }

      results.details.push({
        id: row.id,
        propertyName,
        calendarName,
        url: row.ical_url,
        status: 'healthy',
      });
    } else {
      results.broken++;
      const errorMessage = check.error || 'Unknown calendar fetch error';

      // Update DB with failed status and error message
      await service
        .from('property_ical_sources')
        .update({
          sync_status: 'failed',
          sync_error: errorMessage.slice(0, 500),
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      // Dispatch alert to host & admins
      const alertResult = await dispatchBrokenIcalEmail({
        service,
        appUrl,
        calendarId: row.id,
        propertyId: row.property_id,
        hostId: row.host_id,
        propertyName,
        calendarName,
        icalUrl: row.ical_url,
        errorMessage,
        lastSyncedAt: new Date().toISOString(),
      });

      if (alertResult.dispatched) {
        results.alertsSent++;
      }

      results.details.push({
        id: row.id,
        propertyName,
        calendarName,
        url: row.ical_url,
        status: 'broken',
        error: errorMessage,
        alertSent: alertResult.dispatched,
      });
    }
  }

  return results;
}
