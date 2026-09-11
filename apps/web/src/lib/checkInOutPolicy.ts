/** Check-in / check-out clock times and early / late stay options (HH:mm).
 * Stored values are wall-clock times in the platform zone (US Eastern).
 * Traveler UI converts them to the viewer's local timezone.
 */

export type CheckInOutPolicy = {
  checkInTime: string | null;
  checkOutTime: string | null;
  earlyCheckInAllowed: boolean;
  earliestEarlyCheckInTime: string | null;
  earlyCheckInFee: number;
  lateCheckOutAllowed: boolean;
  latestLateCheckOutTime: string | null;
  lateCheckOutFee: number;
};

/** Platform canonical zone for property clock times (US Eastern). */
export const PROPERTY_CLOCK_TIMEZONE = 'America/New_York';

/** Default check-in when host has not set one: 4:00 PM Eastern. */
export const DEFAULT_CHECK_IN_TIME = '16:00';

/** Default check-out when host has not set one: 11:00 AM Eastern. */
export const DEFAULT_CHECK_OUT_TIME = '11:00';

export const EMPTY_CHECK_IN_OUT_POLICY: CheckInOutPolicy = {
  checkInTime: null,
  checkOutTime: null,
  earlyCheckInAllowed: false,
  earliestEarlyCheckInTime: null,
  earlyCheckInFee: 0,
  lateCheckOutAllowed: false,
  latestLateCheckOutTime: null,
  lateCheckOutFee: 0,
};

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** 30-minute steps from 06:00 through 23:30 inclusive. */
export function buildTimeOptions(
  startHour = 6,
  endHour = 23,
  stepMinutes = 30
): string[] {
  const out: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      if (h === endHour && m > 30) break;
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
}

export const CHECK_IN_OUT_TIME_OPTIONS = buildTimeOptions();

export function normalizeHhmm(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Accept HH:mm:ss from Postgres TIME if ever stored that way
  const short = s.length >= 5 ? s.slice(0, 5) : s;
  if (!HHMM_RE.test(short)) return null;
  return short;
}

/** Host-set check-in, or platform default (4 PM Eastern). */
export function effectiveCheckInTime(
  policy?: Pick<CheckInOutPolicy, 'checkInTime'> | null
): string {
  return normalizeHhmm(policy?.checkInTime) ?? DEFAULT_CHECK_IN_TIME;
}

/** Host-set check-out, or platform default (11 AM Eastern). */
export function effectiveCheckOutTime(
  policy?: Pick<CheckInOutPolicy, 'checkOutTime'> | null
): string {
  return normalizeHhmm(policy?.checkOutTime) ?? DEFAULT_CHECK_OUT_TIME;
}

export function hhmmToMinutes(hhmm: string | null | undefined): number | null {
  const n = normalizeHhmm(hhmm);
  if (!n) return null;
  const [h, m] = n.split(':').map(Number);
  return h * 60 + m;
}

export function compareHhmm(a: string | null | undefined, b: string | null | undefined): number {
  const am = hhmmToMinutes(a);
  const bm = hhmmToMinutes(b);
  if (am == null && bm == null) return 0;
  if (am == null) return -1;
  if (bm == null) return 1;
  return am - bm;
}

/** Format HH:mm as 12-hour label without timezone (host editor / naive display). */
export function formatHhmmLabel(hhmm: string | null | undefined): string {
  const n = normalizeHhmm(hhmm);
  if (!n) return 'Not set';
  const [hStr, mStr] = n.split(':');
  let h = Number(hStr);
  const m = Number(mStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

function ymdPartsInZone(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '1');
  return { y: get('year'), m: get('month'), d: get('day') };
}

function ymdHmInZone(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Instant when `hhmm` wall-clock occurs in `timeZone` on the calendar day of `ref` in that zone. */
export function wallTimeInZoneToDate(
  hhmm: string,
  timeZone: string,
  ref: Date = new Date()
): Date {
  const n = normalizeHhmm(hhmm);
  if (!n) return ref;
  const [H, M] = n.split(':').map(Number);
  const { y, m, d } = ymdPartsInZone(ref, timeZone);
  const ymd = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const target = `${ymd}T${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;

  let lo = Date.UTC(y, m - 1, d) - 36 * 3600 * 1000;
  let hi = Date.UTC(y, m - 1, d) + 36 * 3600 * 1000;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (ymdHmInZone(mid, timeZone) < target) lo = mid + 1;
    else hi = mid;
  }
  return new Date(lo);
}

function viewerTimeZone(explicit?: string): string {
  if (explicit) return explicit;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || PROPERTY_CLOCK_TIMEZONE;
  } catch {
    return PROPERTY_CLOCK_TIMEZONE;
  }
}

/**
 * Format a property clock time (HH:mm in US Eastern) for the traveler's local timezone.
 * Example: 16:00 Eastern → "1:00 PM PST" for a Pacific viewer.
 */
export function formatPropertyClockForViewer(
  hhmm: string | null | undefined,
  opts?: { timeZone?: string; includeZone?: boolean }
): string {
  const n = normalizeHhmm(hhmm);
  if (!n) return 'Not set';
  const viewerTz = viewerTimeZone(opts?.timeZone);
  const instant = wallTimeInZoneToDate(n, PROPERTY_CLOCK_TIMEZONE);
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: viewerTz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(opts?.includeZone === false ? {} : { timeZoneName: 'short' }),
    }).format(instant);
  } catch {
    return formatHhmmLabel(n);
  }
}

/** Effective check-in label in the viewer's timezone (applies Eastern default if unset). */
export function formatEffectiveCheckInForViewer(
  policy?: Pick<CheckInOutPolicy, 'checkInTime'> | null,
  opts?: { timeZone?: string }
): string {
  return formatPropertyClockForViewer(effectiveCheckInTime(policy), opts);
}

/** Effective check-out label in the viewer's timezone (applies Eastern default if unset). */
export function formatEffectiveCheckOutForViewer(
  policy?: Pick<CheckInOutPolicy, 'checkOutTime'> | null,
  opts?: { timeZone?: string }
): string {
  return formatPropertyClockForViewer(effectiveCheckOutTime(policy), opts);
}

export function normalizeFee(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function propertyMissingCheckInOutTimes(row: {
  check_in_time?: string | null;
  check_out_time?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}): boolean {
  const checkIn = normalizeHhmm(row.check_in_time ?? row.checkInTime);
  const checkOut = normalizeHhmm(row.check_out_time ?? row.checkOutTime);
  return !checkIn || !checkOut;
}

/** Times between earliest (inclusive) and standard check-in (exclusive of standard? include both ends for UX). */
export function earlyCheckInTimeOptions(
  earliest: string | null,
  standardCheckIn: string | null
): string[] {
  const start = hhmmToMinutes(earliest);
  const end = hhmmToMinutes(standardCheckIn);
  if (start == null || end == null || start >= end) return [];
  return CHECK_IN_OUT_TIME_OPTIONS.filter((t) => {
    const m = hhmmToMinutes(t);
    return m != null && m >= start && m < end;
  });
}

export function lateCheckOutTimeOptions(
  standardCheckOut: string | null,
  latest: string | null
): string[] {
  const start = hhmmToMinutes(standardCheckOut);
  const end = hhmmToMinutes(latest);
  if (start == null || end == null || start >= end) return [];
  return CHECK_IN_OUT_TIME_OPTIONS.filter((t) => {
    const m = hhmmToMinutes(t);
    return m != null && m > start && m <= end;
  });
}

export function validateCheckInOutPolicy(policy: CheckInOutPolicy): string | null {
  const checkIn = normalizeHhmm(policy.checkInTime);
  const checkOut = normalizeHhmm(policy.checkOutTime);

  if (policy.earlyCheckInAllowed) {
    if (!checkIn) return 'Set a standard check-in time before allowing early check-in.';
    const earliest = normalizeHhmm(policy.earliestEarlyCheckInTime);
    if (!earliest) return 'Select the earliest early check-in time.';
    if (compareHhmm(earliest, checkIn) >= 0) {
      return 'Earliest early check-in must be before the standard check-in time.';
    }
    if (policy.earlyCheckInFee < 0) return 'Early check-in fee cannot be negative.';
  }

  if (policy.lateCheckOutAllowed) {
    if (!checkOut) return 'Set a standard check-out time before allowing late check-out.';
    const latest = normalizeHhmm(policy.latestLateCheckOutTime);
    if (!latest) return 'Select the latest late check-out time.';
    if (compareHhmm(latest, checkOut) <= 0) {
      return 'Latest late check-out must be after the standard check-out time.';
    }
    if (policy.lateCheckOutFee < 0) return 'Late check-out fee cannot be negative.';
  }

  return null;
}

export function policyFromDbRow(row: Record<string, unknown> | null | undefined): CheckInOutPolicy {
  if (!row) return { ...EMPTY_CHECK_IN_OUT_POLICY };
  return {
    checkInTime: normalizeHhmm(row.check_in_time ?? row.checkInTime),
    checkOutTime: normalizeHhmm(row.check_out_time ?? row.checkOutTime),
    earlyCheckInAllowed: Boolean(row.early_check_in_allowed ?? row.earlyCheckInAllowed),
    earliestEarlyCheckInTime: normalizeHhmm(
      row.earliest_early_check_in_time ?? row.earliestEarlyCheckInTime
    ),
    earlyCheckInFee: normalizeFee(row.early_check_in_fee ?? row.earlyCheckInFee),
    lateCheckOutAllowed: Boolean(row.late_check_out_allowed ?? row.lateCheckOutAllowed),
    latestLateCheckOutTime: normalizeHhmm(
      row.latest_late_check_out_time ?? row.latestLateCheckOutTime
    ),
    lateCheckOutFee: normalizeFee(row.late_check_out_fee ?? row.lateCheckOutFee),
  };
}

export function policyToDbColumns(policy: CheckInOutPolicy): Record<string, unknown> {
  const checkIn = normalizeHhmm(policy.checkInTime);
  const checkOut = normalizeHhmm(policy.checkOutTime);
  const earlyAllowed = Boolean(policy.earlyCheckInAllowed) && Boolean(checkIn);
  const lateAllowed = Boolean(policy.lateCheckOutAllowed) && Boolean(checkOut);
  return {
    check_in_time: checkIn,
    check_out_time: checkOut,
    early_check_in_allowed: earlyAllowed,
    earliest_early_check_in_time: earlyAllowed
      ? normalizeHhmm(policy.earliestEarlyCheckInTime)
      : null,
    early_check_in_fee: earlyAllowed ? normalizeFee(policy.earlyCheckInFee) : 0,
    late_check_out_allowed: lateAllowed,
    latest_late_check_out_time: lateAllowed
      ? normalizeHhmm(policy.latestLateCheckOutTime)
      : null,
    late_check_out_fee: lateAllowed ? normalizeFee(policy.lateCheckOutFee) : 0,
  };
}

export function computeEarlyLateFees(params: {
  policy: CheckInOutPolicy;
  earlyRequested: boolean;
  lateRequested: boolean;
}): { earlyFee: number; lateFee: number; total: number } {
  const earlyFee =
    params.earlyRequested && params.policy.earlyCheckInAllowed
      ? normalizeFee(params.policy.earlyCheckInFee)
      : 0;
  const lateFee =
    params.lateRequested && params.policy.lateCheckOutAllowed
      ? normalizeFee(params.policy.lateCheckOutFee)
      : 0;
  return { earlyFee, lateFee, total: Math.round((earlyFee + lateFee) * 100) / 100 };
}
