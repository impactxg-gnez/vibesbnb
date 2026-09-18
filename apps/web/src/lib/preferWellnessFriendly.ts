/** Default: travellers prefer Full Vibe / Balcony Vibe (green & gold) stays first. */
export const PREFER_WELLNESS_DEFAULT = true;

export const PREFER_WELLNESS_META_KEY = 'prefer_wellness_friendly';
export const PREFER_WELLNESS_STORAGE_KEY = 'vbnb_prefer_wellness_friendly';
export const PREFER_WELLNESS_CHANGE_EVENT = 'vbnb:prefer-wellness-change';

/** URL query key for search “Wellness first” toggle (green / gold vibe markers). */
export const VIBE_FIRST_QUERY_KEY = 'vibeFirst';

export function resolvePreferWellnessFriendly(opts: {
  profileValue?: boolean | null;
  metadataValue?: unknown;
  localValue?: string | null;
  /** `1` / `0` / `true` / `false` from `?vibeFirst=` */
  urlValue?: string | null;
}): boolean {
  if (opts.urlValue === '1' || opts.urlValue === 'true') return true;
  if (opts.urlValue === '0' || opts.urlValue === 'false') return false;
  if (typeof opts.profileValue === 'boolean') return opts.profileValue;
  if (typeof opts.metadataValue === 'boolean') return opts.metadataValue;
  if (opts.metadataValue === 'true' || opts.metadataValue === 1) return true;
  if (opts.metadataValue === 'false' || opts.metadataValue === 0) return false;
  if (opts.localValue === 'true') return true;
  if (opts.localValue === 'false') return false;
  return PREFER_WELLNESS_DEFAULT;
}

/** Full Vibe / Balcony Vibe — 420 allowed inside and outside (green or gold glow). */
export function listingHasVibeGlow(
  indoorAllowed: boolean | undefined,
  outdoorAllowed: boolean | undefined
): boolean {
  return indoorAllowed === true && outdoorAllowed === true;
}

/**
 * Higher = more wellness-first.
 * 2 = Full Vibe / Balcony Vibe (inside + outside)
 * 1 = wellness-friendly (flag or consumption allowed in any area)
 * 0 = not wellness-friendly
 */
export function wellnessPreferenceRank(opts: {
  indoor?: boolean;
  outdoor?: boolean;
  wellnessFriendly?: boolean;
}): number {
  if (listingHasVibeGlow(opts.indoor, opts.outdoor)) return 2;
  if (opts.wellnessFriendly === true || opts.indoor === true || opts.outdoor === true) return 1;
  return 0;
}

/** Negative → a before b. When preferWellness is off, skip this key (price/availability win). */
export function compareWellnessPreference(
  aFriendly: boolean | undefined,
  bFriendly: boolean | undefined,
  preferWellness: boolean
): number {
  if (!preferWellness) return 0;
  const a = aFriendly === true ? 1 : 0;
  const b = bFriendly === true ? 1 : 0;
  return b - a;
}

export function compareWellnessPreferenceRank(
  aRank: number,
  bRank: number,
  preferWellness: boolean
): number {
  if (!preferWellness) return 0;
  return bRank - aRank;
}

export function readLocalPreferWellnessFriendly(): boolean {
  if (typeof window === 'undefined') return PREFER_WELLNESS_DEFAULT;
  try {
    return resolvePreferWellnessFriendly({
      localValue: localStorage.getItem(PREFER_WELLNESS_STORAGE_KEY),
    });
  } catch {
    return PREFER_WELLNESS_DEFAULT;
  }
}

export function writeLocalPreferWellnessFriendly(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFER_WELLNESS_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore quota */
  }
  try {
    window.dispatchEvent(new CustomEvent(PREFER_WELLNESS_CHANGE_EVENT, { detail: value }));
  } catch {
    /* ignore */
  }
}
