import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface AvailabilityEntry {
  day: string;
  status: 'available' | 'blocked';
  note?: string;
  room_id?: string | null;
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
      .select('id, day, status, note, room_id, booking_id')
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
    const deletions: { day: string; room_id: string | null }[] = [];

    body.entries.forEach((entry) => {
      if (!entry.day || !entry.status) {
        return;
      }
      if (!['available', 'blocked'].includes(entry.status)) {
        return;
      }

      const roomId = entry.room_id ?? null;

      if (entry.status === 'available') {
        deletions.push({ day: entry.day, room_id: roomId });
      } else {
        upserts.push({
          property_id: params.id,
          host_id: user.id,
          day: entry.day,
          status: entry.status,
          note: entry.note ?? null,
          room_id: roomId,
        });
      }
    });

    // Handle upserts manually due to partial unique indexes
    for (const entry of upserts) {
      // First try to update existing entry
      let updateQuery = supabase
        .from('property_availability')
        .update({
          status: entry.status,
          note: entry.note,
          host_id: entry.host_id,
        })
        .eq('property_id', entry.property_id)
        .eq('day', entry.day);

      if (entry.room_id) {
        updateQuery = updateQuery.eq('room_id', entry.room_id);
      } else {
        updateQuery = updateQuery.is('room_id', null);
      }

      const { data: updated, error: updateError } = await updateQuery.select();
      
      // If no rows updated, insert new entry
      if (!updateError && (!updated || updated.length === 0)) {
        const { error: insertError } = await supabase
          .from('property_availability')
          .insert(entry);
        
        if (insertError) {
          throw insertError;
        }
      } else if (updateError) {
        throw updateError;
      }
    }

    // Delete entries that are being set back to available
    for (const deletion of deletions) {
      let deleteQuery = supabase
        .from('property_availability')
        .delete()
        .eq('property_id', params.id)
        .eq('day', deletion.day)
        .eq('status', 'blocked'); // Only delete blocked entries, not booked ones
      
      if (deletion.room_id) {
        deleteQuery = deleteQuery.eq('room_id', deletion.room_id);
      } else {
        deleteQuery = deleteQuery.is('room_id', null);
      }
      
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        console.warn('Failed to delete availability entry:', deleteError);
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

