/** Listings registered within this window show the "New Vibe" badge (no reviews yet). */
export const NEW_VIBE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * True when the property was created within the last 30 days.
 */
export function isPropertyNewVibe(createdAt: string | Date | null | undefined): boolean {
  if (!createdAt) return false;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return Date.now() - created.getTime() <= NEW_VIBE_MAX_AGE_MS;
}

/** Show "New Vibe" only when there are no reviews and the listing is newly registered. */
export function shouldShowNewVibeBadge(
  createdAt: string | Date | null | undefined,
  reviewCount: number | null | undefined
): boolean {
  const reviews = reviewCount ?? 0;
  if (reviews > 0) return false;
  return isPropertyNewVibe(createdAt);
}
