import { calendarYmd, enumerateStayNightsYmd } from '@/lib/dateUtils';

export function isUnavailableStayStatus(status?: string | null): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'blocked' || s === 'booked';
}

export function stayOverlapsUnavailable(
  checkIn: string,
  checkOut: string,
  unavailableYmd: Iterable<string>
): boolean {
  const blocked = unavailableYmd instanceof Set ? unavailableYmd : new Set(unavailableYmd);
  for (const night of enumerateStayNightsYmd(checkIn, checkOut)) {
    if (blocked.has(night)) return true;
  }
  return false;
}

export function unavailableDaysFromAvailabilityRows(
  rows: Array<{ day?: string | null; status?: string | null; room_id?: string | null }>,
  selectedRoomIds?: string[]
): string[] {
  const selected = new Set((selectedRoomIds || []).filter(Boolean));
  const days = new Set<string>();
  for (const entry of rows) {
    const day = calendarYmd(entry.day);
    if (!day || !isUnavailableStayStatus(entry.status)) continue;
    const rid = entry.room_id || null;
    if (!rid) days.add(day);
    else if (selected.size > 0 && selected.has(rid)) days.add(day);
  }
  return [...days];
}

export function customDailyRatesFromAvailabilityRows(
  rows: Array<{ day?: string | null; price?: number | null; status?: string | null }>
): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const entry of rows) {
    const day = calendarYmd(entry.day);
    if (!day || isUnavailableStayStatus(entry.status)) continue;
    if (entry.price != null && Number(entry.price) > 0) {
      rates[day] = Number(entry.price);
    }
  }
  return rates;
}
