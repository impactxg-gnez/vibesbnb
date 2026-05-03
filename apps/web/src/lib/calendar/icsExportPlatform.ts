import type { SupabaseClient } from '@supabase/supabase-js';
import { formatYmdUtc } from '@/lib/calendar/icsParseIncoming';

type Span = {
  kind: string;
  start: string; // inclusive YYYY-MM-DD
  endExclusive: string; // YYYY-MM-DD (iCal-exclusive)
};

function addDaysYmd(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatYmdUtc(dt);
}

function cmpYmd(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Merge overlapping / adjacent occupancy spans before emitting ICS. */
function mergeSpansSameKind(spans: Span[]): Span[] {
  if (spans.length === 0) return [];
  const sorted = [...spans].sort(
    (a, b) => cmpYmd(a.start, b.start) || cmpYmd(a.endExclusive, b.endExclusive)
  );
  const out: Span[] = [];
  let cur = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    const sameKind = n.kind === cur.kind;
    const merges = sameKind && cmpYmd(n.start, cur.endExclusive) <= 0;
    if (merges) {
      if (cmpYmd(n.endExclusive, cur.endExclusive) > 0) cur.endExclusive = n.endExclusive;
    } else {
      out.push(cur);
      cur = { ...n };
    }
  }
  out.push(cur);
  return out;
}

export function renderIcsCalendar(params: {
  propertyName: string;
  propertyId: string;
  spans: Span[];
}): string {
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const safeName = params.propertyName.replace(/[\r\n,;\\]/g, ' ');

  let ical = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//VibesBNB//Calendar//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:${safeName}\r\nX-WR-TIMEZONE:UTC\r\n`;

  params.spans.forEach((span, index) => {
    const startDate = span.start.replace(/-/g, '');
    const endDate = span.endExclusive.replace(/-/g, '');
    const uid = `vibesbnb-${params.propertyId}-${span.kind}-${span.start}-${index}@vibesbnb.com`;
    const summary = span.kind === 'booked' ? 'Booked (VibesBNB)' : 'Unavailable (VibesBNB)';
    ical += `BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${startDate}\r\nDTEND;VALUE=DATE:${endDate}\r\nDTSTAMP:${dtstamp}\r\nUID:${uid}\r\nSUMMARY:${summary}\r\nSTATUS:CONFIRMED\r\nTRANSP:OPAQUE\r\nEND:VEVENT\r\n`;
  });

  ical += 'END:VCALENDAR\r\n';
  return ical;
}

export async function loadPlatformOccupancySpans(params: {
  service: SupabaseClient;
  propertyId: string;
  windowStart: Date;
  windowEndExclusive: Date;
}): Promise<Span[]> {
  const startStr = formatYmdUtc(params.windowStart);
  const endStr = formatYmdUtc(params.windowEndExclusive);
  const spans: Span[] = [];

  const { data: bookingRows, error: bErr } = await params.service
    .from('bookings')
    .select('id, check_in, check_out, status')
    .eq('property_id', params.propertyId)
    .in('status', ['accepted', 'confirmed'])
    .lt('check_in', endStr)
    .gt('check_out', startStr);

  if (bErr) throw bErr;

  for (const b of bookingRows || []) {
    const cin = typeof b.check_in === 'string' ? b.check_in.slice(0, 10) : '';
    const cout = typeof b.check_out === 'string' ? b.check_out.slice(0, 10) : '';
    if (!cin || !cout) continue;

    const s = cin >= startStr ? cin : startStr;
    const eEx = cout <= endStr ? cout : endStr;
    if (s < eEx) {
      spans.push({ kind: 'booked', start: s, endExclusive: eEx });
    }
  }

  const { data: blockedRows, error: aErr } = await params.service
    .from('property_availability')
    .select('day, status')
    .eq('property_id', params.propertyId)
    .gte('day', startStr)
    .lt('day', endStr)
    .eq('status', 'blocked')
    .is('room_id', null);

  if (aErr) throw aErr;

  const blockedDays = [...new Set((blockedRows || []).map((r: { day: string }) => r.day))]
    .sort(cmpYmd)
    .filter(Boolean);

  if (blockedDays.length > 0) {
    let runStart = blockedDays[0];
    let prev = blockedDays[0];

    const flushBlockedRun = () => {
      const endExclusive = addDaysYmd(prev, 1);
      spans.push({
        kind: 'blockedAvail',
        start: runStart,
        endExclusive,
      });
    };

    for (let i = 1; i < blockedDays.length; i++) {
      const d = blockedDays[i];
      if (d === addDaysYmd(prev, 1)) {
        prev = d;
      } else {
        flushBlockedRun();
        runStart = d;
        prev = d;
      }
    }
    flushBlockedRun();
  }

  const mergedBooking = mergeSpansSameKind(spans.filter((s) => s.kind === 'booked'));
  const mergedBlockedRuns = spans.filter((s) => s.kind === 'blockedAvail');
  return [...mergedBooking, ...mergedBlockedRuns];
}
