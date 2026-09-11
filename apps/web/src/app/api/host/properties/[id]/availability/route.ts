import { NextRequest, NextResponse } from 'next/server';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

interface AvailabilityEntry {
  day: string;
  status: 'available' | 'blocked';
  note?: string;
  room_id?: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveHostPropertyAccess(params.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data, error } = await access.db
      .from('property_availability')
      .select('id, day, status, note, room_id, booking_id')
      .eq('property_id', params.id)
      .order('day', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ availability: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load availability';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveHostPropertyAccess(params.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = (await request.json()) as { entries: AvailabilityEntry[] };

    if (!body?.entries || !Array.isArray(body.entries)) {
      return NextResponse.json(
        { error: 'Invalid payload: entries array required' },
        { status: 400 }
      );
    }

    const hostId = access.property.host_id;
    const upserts: Array<{
      property_id: string;
      host_id: string;
      day: string;
      status: string;
      note: string | null;
      room_id: string | null;
    }> = [];
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
          host_id: hostId,
          day: entry.day,
          status: entry.status,
          note: entry.note ?? null,
          room_id: roomId,
        });
      }
    });

    for (const entry of upserts) {
      let updateQuery = access.db
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

      if (!updateError && (!updated || updated.length === 0)) {
        const { error: insertError } = await access.db
          .from('property_availability')
          .insert(entry);

        if (insertError) {
          throw insertError;
        }
      } else if (updateError) {
        throw updateError;
      }
    }

    for (const deletion of deletions) {
      let deleteQuery = access.db
        .from('property_availability')
        .delete()
        .eq('property_id', params.id)
        .eq('day', deletion.day)
        .eq('status', 'blocked');

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

    void invalidatePropertyListingCaches(params.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update availability';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
