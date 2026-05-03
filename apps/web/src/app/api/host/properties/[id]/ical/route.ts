import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { syncOnePropertyIcalSource } from '@/lib/calendar/syncExternalIcal';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
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
      .select('id, host_id, ical_export_token')
      .eq('id', params.id)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.host_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: sources, error: sourcesError } = await supabase
      .from('property_ical_sources')
      .select(
        'id, name, ical_url, last_synced_at, last_hash, sync_status, sync_error, is_active, last_manual_sync_at, created_at'
      )
      .eq('property_id', params.id)
      .order('created_at', { ascending: false });

    if (sourcesError) {
      throw sourcesError;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const token = property.ical_export_token;
    const exportUrl =
      token != null ? `${appUrl}/calendar/${params.id}.ics?token=${encodeURIComponent(token)}` : '';

    /** @deprecated Prefer `exportUrl` (pretty path); kept for backwards compatibility */
    const exportUrlLegacy =
      token != null
        ? `${appUrl}/api/properties/${params.id}/ical/export?token=${encodeURIComponent(token)}`
        : '';

    return NextResponse.json({
      exportUrl,
      exportUrlLegacy,
      sources: sources || [],
    });
  } catch (error: unknown) {
    console.error('Error fetching iCal data:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch iCal data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const body = await request.json();
    const { name, ical_url } = body;

    if (!name || !ical_url) {
      return NextResponse.json({ error: 'Name and iCal URL are required' }, { status: 400 });
    }

    try {
      new URL(ical_url);
    } catch {
      return NextResponse.json({ error: 'Invalid iCal URL format' }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: source, error: insertError } = await service
      .from('property_ical_sources')
      .insert({
        property_id: params.id,
        host_id: user.id,
        name,
        ical_url,
        sync_status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    if (source) {
      const r = await syncOnePropertyIcalSource({
        service,
        calendar: {
          id: source.id,
          property_id: source.property_id,
          host_id: source.host_id,
          ical_url: source.ical_url,
          last_hash: source.last_hash,
          name: source.name,
        },
        force: true,
      });
      if (r.error) {
        await service
          .from('property_ical_sources')
          .update({ sync_error: r.error.slice(0, 500), sync_status: 'failed' })
          .eq('id', source.id);
      }
    }

    return NextResponse.json({ source });
  } catch (error: unknown) {
    console.error('Error adding iCal source:', error);
    const msg = error instanceof Error ? error.message : 'Failed to add iCal source';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json({ error: 'Source ID required' }, { status: 400 });
    }

    const service = createServiceClient();

    const { error: deleteError } = await service
      .from('property_ical_sources')
      .delete()
      .eq('id', sourceId)
      .eq('host_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    await service
      .from('property_availability')
      .delete()
      .eq('ical_source_id', sourceId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting iCal source:', error);
    const msg = error instanceof Error ? error.message : 'Failed to delete iCal source';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
