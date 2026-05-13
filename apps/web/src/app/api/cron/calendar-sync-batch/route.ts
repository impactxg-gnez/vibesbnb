import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  pickIcalSourcesBatch,
  syncOnePropertyIcalSource,
  fetchIcalSourcesByIds,
} from '@/lib/calendar/syncExternalIcal';
import { getRedis } from '@/lib/cache/redis';
import { logApiPerf } from '@/lib/monitoring/apiPerf';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PRIORITY_QUEUE_KEY = 'cal:priority:v1';

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CALENDAR_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret');
  return bearer === secret || headerSecret === secret;
}

async function drainPriorityCalendarIds(
  redis: NonNullable<ReturnType<typeof getRedis>>,
  max: number
): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < max; i++) {
    const id = await redis.rpop<string>(PRIORITY_QUEUE_KEY);
    if (!id || typeof id !== 'string') break;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Batch worker: priority queue (webhook) first, then up to 50 external calendars per invocation.
 * Schedule every 10+ minutes (Vercel Cron, Supabase scheduler, or Edge proxy).
 */
export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();

  try {
    const service = createServiceClient();
    const redis = getRedis();

    const priorityIds = redis ? await drainPriorityCalendarIds(redis, 28) : [];
    const priorityCalendars = await fetchIcalSourcesByIds(service, priorityIds);

    const remainingSlots = Math.max(0, 50 - priorityCalendars.length);
    const rest = remainingSlots > 0 ? await pickIcalSourcesBatch(service, remainingSlots) : [];

    const seen = new Set(priorityCalendars.map((c) => c.id));
    const batch: typeof priorityCalendars = [...priorityCalendars];
    for (const c of rest) {
      if (!seen.has(c.id)) {
        batch.push(c);
        seen.add(c.id);
      }
    }

    const summary: Array<{
      id: string;
      skipped: boolean;
      events: number;
      error?: string;
      dedupeLock?: boolean;
    }> = [];

    for (const cal of batch) {
      const r = await syncOnePropertyIcalSource({ service, calendar: cal });
      summary.push({
        id: cal.id,
        skipped: r.skipped,
        events: r.events,
        error: r.error,
        dedupeLock: r.dedupeLock,
      });
    }

    logApiPerf('POST /api/cron/calendar-sync-batch', Date.now() - t0, {
      processed: summary.length,
      priority: priorityCalendars.length,
      dedupeLocks: summary.filter((s) => s.dedupeLock).length,
    });

    return NextResponse.json({ ok: true, processed: summary.length, summary });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Batch failed';
    console.error('[calendar-sync-batch]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
