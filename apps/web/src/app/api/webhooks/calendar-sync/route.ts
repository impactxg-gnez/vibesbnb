import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/cache/redis';
import { createServiceClient } from '@/lib/supabase/service';
import { logApiPerf } from '@/lib/monitoring/apiPerf';

const QUEUE_KEY = 'cal:priority:v1';

function authorize(request: NextRequest): boolean {
  const secret =
    process.env.CALENDAR_SYNC_WEBHOOK_SECRET?.trim() ||
    process.env.CALENDAR_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-calendar-webhook-secret');
  return bearer === secret || headerSecret === secret;
}

/**
 * Event hook: enqueue one or more external calendar IDs for the next batch worker tick.
 * Body: { "calendarId": "uuid" } | { "calendarIds": ["uuid"] } | { "propertyId": "text" }
 */
export async function POST(request: NextRequest) {
  const started = Date.now();
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured (UPSTASH_REDIS_REST_URL / TOKEN)' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => null) as {
      calendarId?: unknown;
      calendarIds?: unknown;
      propertyId?: unknown;
    } | null;

    const ids: string[] = [];

    if (typeof body?.calendarId === 'string' && body.calendarId.length > 0) {
      ids.push(body.calendarId);
    }
    if (Array.isArray(body?.calendarIds)) {
      for (const x of body.calendarIds) {
        if (typeof x === 'string' && x.length > 0) ids.push(x);
      }
    }

    if (typeof body?.propertyId === 'string' && body.propertyId.length > 0) {
      const service = createServiceClient();
      const { data: rows, error } = await service
        .from('property_ical_sources')
        .select('id')
        .eq('property_id', body.propertyId)
        .eq('is_active', true);
      if (error) throw error;
      for (const r of rows || []) {
        if (r?.id) ids.push(String(r.id));
      }
    }

    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return NextResponse.json(
        { error: 'Provide calendarId, calendarIds[], or propertyId' },
        { status: 400 }
      );
    }

    const pipe = redis.pipeline();
    for (const id of unique) {
      pipe.lpush(QUEUE_KEY, id);
      pipe.ltrim(QUEUE_KEY, 0, 499);
    }
    await pipe.exec();

    logApiPerf('POST /api/webhooks/calendar-sync', Date.now() - started, {
      enqueued: unique.length,
    });

    return NextResponse.json({ ok: true, enqueued: unique.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'enqueue failed';
    console.error('[webhooks/calendar-sync]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
