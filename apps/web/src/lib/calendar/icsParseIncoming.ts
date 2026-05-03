import * as ICAL from 'node-ical';

/** YYYY-MM-DD in UTC calendar components (all-day feeds). */
export function formatYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function inferCalendarSource(icalUrl: string, feedName?: string): string {
  const u = icalUrl.toLowerCase();
  if (u.includes('airbnb')) return 'airbnb';
  if (u.includes('booking.com') || u.includes('booking.')) return 'booking';
  if (u.includes('vrbo') || u.includes('homeaway')) return 'vrbo';
  const n = (feedName || '').toLowerCase();
  if (n.includes('airbnb')) return 'airbnb';
  if (n.includes('booking')) return 'booking';
  return 'ical';
}

export type ParsedIcsStay = {
  uid: string;
  /** First occupied night */
  startInclusive: string;
  /** Morning of checkout (iCal-exclusive) */
  endExclusive: string;
  summary?: string;
};

/**
 * Parse ICS and return blocked stays overlapping [windowStart, windowEndExclusive).
 * Only VEVENT components; recurring rules are ignored in v1 for predictable IO.
 */
export function parseIcsStaysInWindow(
  icsText: string,
  windowStart: Date,
  windowEndExclusive: Date,
  dedupeKeyPrefix = ''
): ParsedIcsStay[] {
  const parsed = ICAL.parseICS(icsText);
  const out: ParsedIcsStay[] = [];
  const seen = new Set<string>();

  const win0 = windowStart.getTime();
  const win1 = windowEndExclusive.getTime();

  for (const k of Object.keys(parsed)) {
    const ev = parsed[k] as any;
    if (!ev || ev.type !== 'VEVENT') continue;

    const rawUid = String(ev.uid ?? '').trim();
    const uid = rawUid || `${dedupeKeyPrefix}${k}-${ev.start}-${ev.end}`;

    const start: Date | undefined = ev.start instanceof Date ? ev.start : undefined;
    let endExclusive: Date | undefined = ev.end instanceof Date ? ev.end : undefined;

    if (!start) continue;

    if (!endExclusive) {
      endExclusive = new Date(start);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    }

    const sTime = start.getTime();
    let eTime = endExclusive.getTime();
    if (!Number.isFinite(sTime) || !Number.isFinite(eTime)) continue;

    const overlapStart = Math.max(sTime, win0);
    const overlapEnd = Math.min(eTime, win1);
    if (overlapStart >= overlapEnd) continue;

    const startClip = new Date(overlapStart);
    const endClip = new Date(overlapEnd);

    const startInclusive = formatYmdUtc(startClip);
    const endExclusiveStr = formatYmdUtc(endClip);

    if (endExclusiveStr <= startInclusive) continue;

    const sig = `${uid}|${startInclusive}|${endExclusiveStr}`;
    if (seen.has(sig)) continue;
    seen.add(sig);

    const summary =
      typeof ev.summary === 'string' && ev.summary.trim().length ? ev.summary.trim() : undefined;

    out.push({ uid, startInclusive, endExclusive: endExclusiveStr, summary });
  }

  return out;
}
