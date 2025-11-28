import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface AvailabilityEntry {
  day: string;
  status: 'available' | 'blocked';
  note?: string;
}

async function ensureHostOwnership(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  userId: string
) {
  const { data: property, error } = await supabase
    .from('properties')
    .select('host_id')
    .eq('id', propertyId)
    .single();

  if (error || !property) {
    throw new Error('Property not found');
  }

  if (property.host_id !== userId) {
    throw new Error('Forbidden');
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureHostOwnership(supabase, params.id, user.id);

    const { data, error } = await supabase
      .from('property_availability')
      .select('id, day, status, note')
      .eq('property_id', params.id)
      .order('day', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ availability: data ?? [] });
  } catch (error: any) {
    const status =
      error.message === 'Forbidden'
        ? 403
        : error.message === 'Property not found'
        ? 404
        : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to load availability' },
      { status }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureHostOwnership(supabase, params.id, user.id);

    const body = (await request.json()) as { entries: AvailabilityEntry[] };

    if (!body?.entries || !Array.isArray(body.entries)) {
      return NextResponse.json(
        { error: 'Invalid payload: entries array required' },
        { status: 400 }
      );
    }

    const upserts: any[] = [];
    const deletions: string[] = [];

    body.entries.forEach((entry) => {
      if (!entry.day || !entry.status) {
        return;
      }
      if (!['available', 'blocked'].includes(entry.status)) {
        return;
      }

      if (entry.status === 'available') {
        deletions.push(entry.day);
      } else {
        upserts.push({
          property_id: params.id,
          host_id: user.id,
          day: entry.day,
          status: entry.status,
          note: entry.note ?? null,
        });
      }
    });

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('property_availability')
        .upsert(upserts, {
          onConflict: 'property_id,day',
        });
      if (upsertError) {
        throw upsertError;
      }
    }

    if (deletions.length > 0) {
      const { error: deleteError } = await supabase
        .from('property_availability')
        .delete()
        .eq('property_id', params.id)
        .in('day', deletions);
      if (deleteError) {
        throw deleteError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status =
      error.message === 'Forbidden'
        ? 403
        : error.message === 'Property not found'
        ? 404
        : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to update availability' },
      { status }
    );
  }
}

