import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { pickIcalSourcesBatch, syncOnePropertyIcalSource } from '@/lib/calendar/syncExternalIcal';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CALENDAR_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret');
  return bearer === secret || headerSecret === secret;
}

/**
 * Batch worker: up to 50 external calendars per invocation.
 * Schedule every 10 minutes (Vercel Cron, Supabase scheduler, or Edge proxy).
 */
export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const service = createServiceClient();
    const batch = await pickIcalSourcesBatch(service, 50);

    const summary: Array<{ id: string; skipped: boolean; events: number; error?: string }> = [];

    for (const cal of batch) {
      const r = await syncOnePropertyIcalSource({ service, calendar: cal });
      summary.push({
        id: cal.id,
        skipped: r.skipped,
        events: r.events,
        error: r.error,
      });
    }

    return NextResponse.json({ ok: true, processed: summary.length, summary });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Batch failed';
    console.error('[calendar-sync-batch]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
