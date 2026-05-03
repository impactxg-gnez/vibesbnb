import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { syncOnePropertyIcalSource } from '@/lib/calendar/syncExternalIcal';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, host_id')
      .eq('id', params.id)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.host_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const service = createServiceClient();

    const { data: sources, error: sourcesError } = await service
      .from('property_ical_sources')
      .select('id, property_id, host_id, ical_url, last_hash, name')
      .eq('property_id', params.id)
      .eq('is_active', true);

    if (sourcesError) {
      throw sourcesError;
    }

    const results: Array<{ id: string; name?: string | null; success: boolean; error?: string; skipped?: boolean; events?: number }> =
      [];

    for (const source of sources || []) {
      const r = await syncOnePropertyIcalSource({
        service,
        calendar: source,
      });
      results.push({
        id: source.id,
        name: source.name,
        success: !r.error,
        error: r.error,
        skipped: r.skipped,
        events: r.events,
      });

      if (r.error) {
        await service
          .from('property_ical_sources')
          .update({ sync_error: r.error.slice(0, 500), sync_status: 'failed' })
          .eq('id', source.id);
      }
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error('Error syncing iCal sources:', error);
    const msg = error instanceof Error ? error.message : 'Failed to sync iCal sources';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
