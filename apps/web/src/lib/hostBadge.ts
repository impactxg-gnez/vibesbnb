/** Minimum approved guest reviews across all listings to earn SuperBud. */
export const SUPERBUD_MIN_REVIEWS = 5;

/** Minimum average star rating (1–5) to earn SuperBud. */
export const SUPERBUD_MIN_AVG_RATING = 4.8;

export type HostBadge = 'superbud' | 'vibesetter';

export type HostReviewStats = {
  reviewCount: number;
  avgRating: number;
};

export function qualifiesForSuperBud(stats: HostReviewStats): boolean {
  return (
    stats.reviewCount >= SUPERBUD_MIN_REVIEWS &&
    stats.avgRating >= SUPERBUD_MIN_AVG_RATING
  );
}

/**
 * Resolves the badge shown in the UI.
 * - Grandfathered `superbud` in DB always shows SuperBud.
 * - `vibesetter` promotes to SuperBud when review stats qualify.
 */
export function resolveHostBadge(
  storedBadge: string | null | undefined,
  stats: HostReviewStats | null | undefined,
  isHost: boolean
): HostBadge | null {
  if (!isHost) return null;

  if (storedBadge === 'superbud') return 'superbud';

  if (stats && qualifiesForSuperBud(stats)) return 'superbud';

  if (storedBadge === 'vibesetter') return 'vibesetter';

  return 'vibesetter';
}

export function hostBadgeLabel(badge: HostBadge): string {
  return badge === 'superbud' ? 'SuperBud' : 'VibeSetter';
}
