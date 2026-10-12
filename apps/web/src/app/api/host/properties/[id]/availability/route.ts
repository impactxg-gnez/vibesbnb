import { NextRequest, NextResponse } from 'next/server';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

interface AvailabilityEntry {
  day: string;
  status: 'available' | 'blocked';
  price?: number | null;
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

    let data: any[] | null = null;
    let error: any = null;

    const initial = await access.db
      .from('property_availability')
      .select('id, day, status, note, room_id, booking_id, price')
      .eq('property_id', params.id)
      .order('day', { ascending: true });

    if (initial.error && (initial.error.code === '42703' || initial.error.message?.includes('price'))) {
      // Fallback if price column migration has not yet been executed in DB
      const fallback = await access.db
        .from('property_availability')
        .select('id, day, status, note, room_id, booking_id')
        .eq('property_id', params.id)
        .order('day', { ascending: true });
      data = fallback.data;
      error = fallback.error;
    } else {
      data = initial.data;
      error = initial.error;
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({
      availability: data ?? [],
      basePrice: Number(access.property.price) || 0,
    });
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
      price?: number | null;
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
      const customPrice =
        entry.price != null && !isNaN(Number(entry.price)) && Number(entry.price) > 0
          ? Number(entry.price)
          : null;

      if (entry.status === 'available' && customPrice == null) {
        // Reset to default available with no price override: remove record from table
        deletions.push({ day: entry.day, room_id: roomId });
      } else {
        // Either blocked OR available with custom price override
        upserts.push({
          property_id: params.id,
          host_id: hostId,
          day: entry.day,
          status: entry.status,
          price: customPrice,
          note: entry.note ?? null,
          room_id: roomId,
        });
      }
    });

    for (const entry of upserts) {
      const updatePayload: Record<string, unknown> = {
        status: entry.status,
        note: entry.note,
        host_id: entry.host_id,
        price: entry.price,
      };

      let updateQuery = access.db
        .from('property_availability')
        .update(updatePayload)
        .eq('property_id', entry.property_id)
        .eq('day', entry.day);

      if (entry.room_id) {
        updateQuery = updateQuery.eq('room_id', entry.room_id);
      } else {
        updateQuery = updateQuery.is('room_id', null);
      }

      let { data: updated, error: updateError } = await updateQuery.select();

      // Graceful fallback if price column does not exist yet
      if (updateError && (updateError.code === '42703' || updateError.message?.includes('price'))) {
        delete updatePayload.price;
        let retryUpdate = access.db
          .from('property_availability')
          .update(updatePayload)
          .eq('property_id', entry.property_id)
          .eq('day', entry.day);
        if (entry.room_id) {
          retryUpdate = retryUpdate.eq('room_id', entry.room_id);
        } else {
          retryUpdate = retryUpdate.is('room_id', null);
        }
        const retryRes = await retryUpdate.select();
        updated = retryRes.data;
        updateError = retryRes.error;
      }

      if (!updateError && (!updated || updated.length === 0)) {
        const insertPayload: Record<string, unknown> = { ...entry };
        let { error: insertError } = await access.db
          .from('property_availability')
          .insert(insertPayload);

        if (insertError && (insertError.code === '42703' || insertError.message?.includes('price'))) {
          delete insertPayload.price;
          const retryInsert = await access.db
            .from('property_availability')
            .insert(insertPayload);
          insertError = retryInsert.error;
        }

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
        .neq('status', 'booked'); // Never delete guest bookings

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
