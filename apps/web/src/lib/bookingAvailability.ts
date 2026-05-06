import type { SupabaseClient } from '@supabase/supabase-js';

type ServiceSupabase = SupabaseClient;

function enumerateStayDays(checkInYmd: string, checkOutYmd: string): string[] {
  const days: string[] = [];
  const start = new Date(checkInYmd + 'T12:00:00');
  const end = new Date(checkOutYmd + 'T12:00:00');
  for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
    days.push(cursor.toISOString().split('T')[0]);
  }
  return days;
}

export async function releaseBookingAvailability(
  service: ServiceSupabase,
  bookingId: string
): Promise<void> {
  await service
    .from('property_availability')
    .update({
      status: 'available',
      booking_id: null,
      note: null,
    })
    .eq('booking_id', bookingId)
    .eq('status', 'booked');
}

type SelectedUnit = { id?: string | null };

export async function assertStayDoesNotConflict(
  service: ServiceSupabase,
  params: {
    propertyId: string;
    bookingId: string;
    checkInYmd: string;
    checkOutYmd: string;
    selectedUnits: SelectedUnit[] | null | undefined;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const days = enumerateStayDays(params.checkInYmd, params.checkOutYmd);
  if (days.length === 0) {
    return { ok: false, message: 'Invalid stay dates' };
  }

  const unitsToCheck =
    params.selectedUnits && params.selectedUnits.length > 0
      ? params.selectedUnits
      : [{ id: null as string | null }];

  for (const unit of unitsToCheck) {
    const roomId = unit.id || null;
    let q = service
      .from('property_availability')
      .select('id, status, booking_id, day')
      .eq('property_id', params.propertyId)
      .in('day', days)
      .in('status', ['booked', 'blocked']);

    if (roomId) {
      q = q.eq('room_id', roomId);
    } else {
      q = q.is('room_id', null);
    }

    const { data: rows, error } = await q;
    if (error) {
      return { ok: false, message: 'Could not verify availability' };
    }

    for (const row of rows || []) {
      const otherBooking =
        row.status === 'booked' &&
        row.booking_id &&
        String(row.booking_id) !== params.bookingId;
      if (otherBooking || row.status === 'blocked') {
        return {
          ok: false,
          message:
            'Those dates are no longer available for this property. Ask the guest to pick different dates or reject the request.',
        };
      }
    }
  }

  return { ok: true };
}

export async function blockBookingNights(
  service: ServiceSupabase,
  params: {
    propertyId: string;
    hostId: string;
    bookingId: string;
    checkInYmd: string;
    checkOutYmd: string;
    selectedUnits: SelectedUnit[] | null | undefined;
  }
): Promise<void> {
  const start = new Date(params.checkInYmd + 'T12:00:00');
  const end = new Date(params.checkOutYmd + 'T12:00:00');

  const unitsToBlock =
    params.selectedUnits && params.selectedUnits.length > 0
      ? params.selectedUnits
      : [{ id: null as string | null }];

  for (const unit of unitsToBlock) {
    const daysToBlock: {
      day: string;
      status: 'booked';
      property_id: string;
      host_id: string;
      room_id: string | null;
      booking_id: string;
    }[] = [];

    for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
      const dateKey = cursor.toISOString().split('T')[0];
      daysToBlock.push({
        day: dateKey,
        status: 'booked',
        property_id: params.propertyId,
        host_id: params.hostId,
        room_id: unit.id || null,
        booking_id: params.bookingId,
      });
    }

    for (const block of daysToBlock) {
      let updateQuery = service
        .from('property_availability')
        .update({
          status: 'booked',
          booking_id: block.booking_id,
          host_id: block.host_id,
        })
        .eq('property_id', block.property_id)
        .eq('day', block.day);

      if (block.room_id) {
        updateQuery = updateQuery.eq('room_id', block.room_id);
      } else {
        updateQuery = updateQuery.is('room_id', null);
      }

      const { data: updated, error: updateError } = await updateQuery.select();

      if (!updateError && (!updated || updated.length === 0)) {
        const { error: insertError } = await service.from('property_availability').insert(block);
        if (insertError) {
          console.warn('Failed to insert booked day:', block.day, insertError);
        }
      } else if (updateError) {
        console.warn('Failed to update booked day:', block.day, updateError);
      }
    }
  }
}
