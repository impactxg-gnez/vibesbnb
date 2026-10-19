import type { StaySearchInput } from '@/lib/concierge/types';

export function asSearchInput(args: Record<string, unknown>): StaySearchInput {
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    area: str(args.area),
    checkIn: str(args.checkIn)?.slice(0, 10) || null,
    checkOut: str(args.checkOut)?.slice(0, 10) || null,
    guests: num(args.guests),
    maxNightly: num(args.maxNightly),
    cannabisFriendly:
      args.cannabisFriendly === true ? true : args.cannabisFriendly === false ? false : null,
  };
}
