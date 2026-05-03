/**
 * sync-calendars — scalable ICS ingest (runs on a ~10-minute schedule).
 *
 * Env (Secrets in Supabase Dashboard → Edge Functions → sync-calendars):
 *   SUPABASE_URL                 — injected by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY    — injected by Supabase (or set manually)
 *   SYNC_CALENDARS_SECRET        — Bearer token callers must send (cron / webhook)
 *
 * Queries READ from VIEW `external_calendars`; WRITE to `property_ical_sources`
 * + `calendar_import_bookings` (PostgREST cannot UPDATE through this view reliably).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import ical from "npm:node-ical@0.19.0";

const UPSERT_BATCH = 100;
const ICS_FETCH_MS = 25_000;
const MAX_PARALLEL = 5;

type ExternalCalendarRow = {
  id: string;
  property_id: string;
  host_id: string;
  ical_url: string;
  last_hash: string | null;
  name: string | null;
  sync_status: string | null;
  is_active: boolean | null;
};

function log(
  kv: Record<string, unknown>,
) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      fn: "sync-calendars",
      ...kv,
    }),
  );
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addMonthsUtc(d: Date, months: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
}

function inferSource(icalUrl: string, feedName?: string): string {
  const u = icalUrl.toLowerCase();
  if (u.includes("airbnb")) return "airbnb";
  if (u.includes("booking.com") || u.includes("booking.")) return "booking";
  if (u.includes("vrbo") || u.includes("homeaway")) return "vrbo";
  const n = (feedName || "").toLowerCase();
  if (n.includes("airbnb")) return "airbnb";
  if (n.includes("booking")) return "booking";
  return "ical";
}

type ParsedStay = { uid: string; startInclusive: string; endExclusive: string };

/**
 * Parsed VEVENTs overlapping [windowStart, windowEndExclusive).
 * Requires composite uniqueness (calendar_id + uid) — not global external_id alone.
 */
function parseIcsStaysInWindow(
  icsText: string,
  windowStart: Date,
  windowEndExclusive: Date,
  uidPrefix: string,
): ParsedStay[] {
  const parsed = ical.parseICS(icsText) as Record<string, unknown>;
  const out: ParsedStay[] = [];
  const seen = new Set<string>();
  const win0 = windowStart.getTime();
  const win1 = windowEndExclusive.getTime();

  for (const k of Object.keys(parsed)) {
    const ev = parsed[k] as {
      type?: string;
      uid?: string;
      start?: Date;
      end?: Date;
      summary?: string;
    };
    if (!ev || ev.type !== "VEVENT") continue;

    const rawUid = String(ev.uid ?? "").trim();
    const uid = rawUid || `${uidPrefix}${k}-${String(ev.start)}-${String(ev.end)}`;

    const start = ev.start instanceof Date ? ev.start : undefined;
    let endExclusive = ev.end instanceof Date ? ev.end : undefined;
    if (!start) continue;
    if (!endExclusive) {
      endExclusive = new Date(start);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    }

    const sTime = start.getTime();
    const eTime = endExclusive.getTime();
    if (!Number.isFinite(sTime) || !Number.isFinite(eTime)) continue;

    const overlapStart = Math.max(sTime, win0);
    const overlapEnd = Math.min(eTime, win1);
    if (overlapStart >= overlapEnd) continue;

    const startInclusive = formatYmdUtc(new Date(overlapStart));
    const endExcl = formatYmdUtc(new Date(overlapEnd));
    if (endExcl <= startInclusive) continue;

    const sig = `${uid}|${startInclusive}|${endExcl}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ uid, startInclusive, endExclusive: endExcl });
  }
  return out;
}

async function updateCalendarMeta(
  sb: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
) {
  const { error } = await sb.from("property_ical_sources").update(patch).eq("id", id);
  if (error) throw error;
}

/** Run worker on `items` with at most `limit` concurrent executions. */
async function parallelPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  async function runWorker() {
    while (true) {
      const i = index++;
      if (i >= items.length) break;
      results[i] = await worker(items[i], i);
    }
  }

  const n = Math.min(Math.max(1, limit), Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => runWorker()));
  return results;
}

async function processOneCalendar(sb: SupabaseClient, row: ExternalCalendarRow): Promise<{
  id: string;
  ok: boolean;
  skipped?: boolean;
  events?: number;
  error?: string;
  ms?: number;
}> {
  const t0 = performance.now();

  try {
    const windowStart = startOfUtcDay();
    const windowEndExclusive = addMonthsUtc(windowStart, 6);
    const windowStartStr = formatYmdUtc(windowStart);
    const windowEndStr = formatYmdUtc(windowEndExclusive);

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ICS_FETCH_MS);
    const res = await fetch(row.ical_url, {
      headers: { "User-Agent": "VibesBNB-sync-calendars/1.0" },
      signal: ctl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`ICS HTTP ${res.status}`);
    }

    const body = await res.text();
    const hash = await sha256Hex(body);

    if (row.last_hash && hash === row.last_hash) {
      await updateCalendarMeta(sb, row.id, {
        last_synced_at: new Date().toISOString(),
      });
      log({ calendarId: row.id, propertyId: row.property_id, phase: "hash_skip", ms: Math.round(performance.now() - t0) });
      return { id: row.id, ok: true, skipped: true, ms: Math.round(performance.now() - t0) };
    }

    const stays = parseIcsStaysInWindow(body, windowStart, windowEndExclusive, `${row.id}:`);

    /** Scope: UNIQUE (external_calendar_id, external_id); global external_id collisions would be unsafe */
    const sourceTag = inferSource(row.ical_url, row.name ?? undefined);
    const rows = stays.map((s) => ({
      property_id: row.property_id,
      external_calendar_id: row.id,
      start_date: s.startInclusive,
      end_date: s.endExclusive,
      source: sourceTag,
      external_id: s.uid,
    }));

    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const slice = rows.slice(i, i + UPSERT_BATCH);
      const { error: upErr } = await sb.from("calendar_import_bookings").upsert(slice, {
        onConflict: "external_calendar_id,external_id",
        ignoreDuplicates: false,
      });
      if (upErr) throw upErr;
    }

    const uidList = [...new Set(stays.map((s) => s.uid))];

    /** Single bounded DELETE for UIDs disappeared from ICS (does not truncate table). */
    const { error: delErr } = await sb.rpc("calendar_delete_import_orphans", {
      p_calendar_id: row.id,
      p_window_start: windowStartStr,
      p_window_end: windowEndStr,
      p_uids: uidList.length > 0 ? uidList : null,
    });
    if (delErr) throw delErr;

    const { error: refErr } = await sb.rpc("calendar_refresh_ical_availability", {
      p_property: row.property_id,
      p_calendar: row.id,
      p_host: row.host_id,
      p_from: windowStartStr,
      p_to: windowEndStr,
    });
    if (refErr) throw refErr;

    await updateCalendarMeta(sb, row.id, {
      last_hash: hash,
      last_synced_at: new Date().toISOString(),
      sync_status: "active",
      sync_error: null,
    });

    log({
      calendarId: row.id,
      propertyId: row.property_id,
      phase: "sync_done",
      events: stays.length,
      ms: Math.round(performance.now() - t0),
    });

    return { id: row.id, ok: true, events: stays.length, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb
      .from("property_ical_sources")
      .update({
        sync_status: "failed",
        sync_error: msg.slice(0, 500),
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    log({
      calendarId: row.id,
      propertyId: row.property_id,
      phase: "error",
      error: msg,
      ms: Math.round(performance.now() - t0),
      level: "error",
    });

    return {
      id: row.id,
      ok: false,
      error: msg,
      ms: Math.round(performance.now() - t0),
    };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = Deno.env.get("SYNC_CALENDARS_SECRET")?.trim();
  const auth = req.headers.get("Authorization")?.trim() ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (secret) {
    if (bearer !== secret) {
      log({ phase: "auth_fail", level: "warn" });
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    log({
      phase: "warn",
      level: "warn",
      message:
        "SYNC_CALENDARS_SECRET unset — refusing to run in production-like mode. Set the secret.",
    });
    return new Response(
      JSON.stringify({
        ok: false,
        error: "misconfigured — set SYNC_CALENDARS_SECRET for this function",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    log({ phase: "misconfig", level: "error", message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    return new Response(JSON.stringify({ ok: false, error: "Supabase env missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  log({ phase: "batch_start", level: "info" });

  const { data: batch, error: qErr } = await sb
    .from("external_calendars")
    .select(
      "id, property_id, host_id, ical_url, last_hash, name, sync_status, is_active",
    )
    .eq("sync_status", "active")
    .eq("is_active", true)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(50);

  if (qErr) {
    log({ phase: "query_error", level: "error", error: qErr.message });
    return new Response(JSON.stringify({ ok: false, error: qErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = (batch ?? []) as ExternalCalendarRow[];
  log({ phase: "batch_loaded", count: rows.length });

  const results = await parallelPool(rows, MAX_PARALLEL, (cal) =>
    processOneCalendar(sb, cal),
  );

  const summary = {
    ok: true,
    processed: results.length,
    succeeded: results.filter((r) => r.ok && !(r as { skipped?: boolean }).skipped).length,
    hash_skipped: results.filter((r) => r.ok && (r as { skipped?: boolean }).skipped).length,
    failed: results.filter((r) => !r.ok).length,
  };

  log({
    phase: "batch_complete",
    level: "info",
    processed: summary.processed,
    succeeded: summary.succeeded,
    hash_skipped: summary.hash_skipped,
    failed: summary.failed,
  });

  return new Response(JSON.stringify({ ...summary, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
