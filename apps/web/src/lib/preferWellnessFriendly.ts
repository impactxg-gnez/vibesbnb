/** Default: travellers prefer 420 / wellness-friendly stays first. */
export const PREFER_WELLNESS_DEFAULT = true;

export const PREFER_WELLNESS_META_KEY = 'prefer_wellness_friendly';
export const PREFER_WELLNESS_STORAGE_KEY = 'vbnb_prefer_wellness_friendly';

export function resolvePreferWellnessFriendly(opts: {
  profileValue?: boolean | null;
  metadataValue?: unknown;
  localValue?: string | null;
}): boolean {
  if (typeof opts.profileValue === 'boolean') return opts.profileValue;
  if (typeof opts.metadataValue === 'boolean') return opts.metadataValue;
  if (opts.metadataValue === 'true' || opts.metadataValue === 1) return true;
  if (opts.metadataValue === 'false' || opts.metadataValue === 0) return false;
  if (opts.localValue === 'true') return true;
  if (opts.localValue === 'false') return false;
  return PREFER_WELLNESS_DEFAULT;
}

/** Negative → a before b. Prefer wellness first when preferWellness is true. */
export function compareWellnessPreference(
  aFriendly: boolean | undefined,
  bFriendly: boolean | undefined,
  preferWellness: boolean
): number {
  const a = aFriendly === true ? 1 : 0;
  const b = bFriendly === true ? 1 : 0;
  return preferWellness ? b - a : a - b;
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
}
