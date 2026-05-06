/**
 * Host-configured minimum stay. Null / invalid = no minimum (beyond checkout > check-in).
 */
export function normalizeMinBookingNights(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(365, Math.floor(n));
}

export function minNightsLabel(n: number): string {
  return `${n} night${n === 1 ? '' : 's'} minimum`;
}
