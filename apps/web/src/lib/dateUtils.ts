/**
 * Calendar-date helpers: avoid `new Date('YYYY-MM-DD')` (UTC midnight → wrong local day).
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function datePartOnly(s: string): string {
  return s.trim().split('T')[0];
}

/** Parse YYYY-MM-DD (or ISO string) as a local calendar date at 00:00 local. */
export function parseCalendarDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const part = datePartOnly(dateStr);
  if (!YMD.test(part)) return null;
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatCalendarDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const local = parseCalendarDate(dateStr);
  if (local) return local.toLocaleDateString('en-US', options);
  const fallback = new Date(dateStr);
  return Number.isNaN(fallback.getTime()) ? '' : fallback.toLocaleDateString('en-US', options);
}

/** Number of nights from check-in (inclusive) to check-out (exclusive), calendar days. */
export function nightsBetweenYmd(checkIn: string, checkOut: string): number {
  const a = parseCalendarDate(checkIn);
  const b = parseCalendarDate(checkOut);
  if (!a || !b) return 0;
  const t1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const t2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  const days = Math.round((t2 - t1) / 86400000);
  return days > 0 ? days : 0;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Each night’s calendar key (YYYY-MM-DD) from check-in through night before check-out. */
export function enumerateStayNightsYmd(checkIn: string, checkOut: string): string[] {
  const start = parseCalendarDate(checkIn);
  const end = parseCalendarDate(checkOut);
  if (!start || !end) return [];
  const endExclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const keys: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cur < endExclusive) {
    keys.push(toYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

export function todayLocalYmd(): string {
  const t = new Date();
  return toYmd(t);
}

export function startOfTodayLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
