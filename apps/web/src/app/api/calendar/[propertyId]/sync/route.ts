import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { syncOnePropertyIcalSource } from '@/lib/calendar/syncExternalIcal';

export const dynamic = 'force-dynamic';

const MANUAL_COOLDOWN_MS = 120_000;

async function throttleManualSync(service: ReturnType<typeof createServiceClient>, propertyId: string) {
  const { data: latest, error } = await service
    .from('property_ical_sources')
    .select('last_manual_sync_at')
    .eq('property_id', propertyId)
    .not('last_manual_sync_at', 'is', null)
    .order('last_manual_sync_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const ts = latest?.last_manual_sync_at as string | undefined;
  if (!ts) return;
  const delta = Date.now() - new Date(ts).getTime();
  if (delta < MANUAL_COOLDOWN_MS) {
    const retry = Math.ceil((MANUAL_COOLDOWN_MS - delta) / 1000);
    throw new Error(`RATE_LIMIT:${retry}`);
  }
}

/**
 * Manual sync for all active iCal sources on a property (host auth).
 * Rate limited per property to reduce abuse / IO spikes.
 */
export async function POST(
  _request: NextRequest,
  context: { params: { propertyId: string } }
) {
  const propertyId = context.params.propertyId;

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createServiceClient();

    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, host_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (propError || !property || property.host_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      await throttleManualSync(service, propertyId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith('RATE_LIMIT:')) {
        const sec = msg.split(':')[1];
        return NextResponse.json(
          { error: `Please wait ${sec}s before syncing again.` },
          { status: 429 }
        );
      }
      throw e;
    }

    const { data: sources, error: sErr } = await service
      .from('property_ical_sources')
      .select('id, property_id, host_id, ical_url, last_hash, name, is_active')
      .eq('property_id', propertyId)
      .eq('is_active', true);

    if (sErr) throw sErr;

    const results: Array<{ id: string; skipped?: boolean; events: number; error?: string }> = [];

    for (const src of sources || []) {
      const r = await syncOnePropertyIcalSource({
        service,
        calendar: {
          id: src.id,
          property_id: src.property_id,
          host_id: src.host_id,
          ical_url: src.ical_url,
          last_hash: src.last_hash,
          name: src.name,
        },
        force: true,
      });
      results.push({
        id: src.id,
        skipped: r.skipped,
        events: r.events,
        error: r.error,
      });
    }

    await service
      .from('property_ical_sources')
      .update({ last_manual_sync_at: new Date().toISOString() })
      .eq('property_id', propertyId);

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Sync failed';
    console.error('[calendar manual sync]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
