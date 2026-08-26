/** Check-in / check-out clock times and early / late stay options (HH:mm). */

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
