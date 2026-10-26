/** Traveler-facing city + state. Mirrors web `cityLabelFromPropertyLocation`. */
export function formatPublicLocation(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';

  const parts = s
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  const stateRe = /^([A-Z]{2})(\s+\d{5}(-\d{4})?)?$/i;

  let i = parts.length - 1;
  if (/^(USA|United States(\s+of\s+America)?|US)$/i.test(parts[i])) {
    i -= 1;
  }

  if (i >= 0) {
    const stateMatch = parts[i].match(stateRe);
    if (stateMatch) {
      const state = stateMatch[1].toUpperCase();
      if (i >= 1) return `${parts[i - 1]}, ${state}`;
      return `${parts[0]}, ${state}`;
    }
  }

  if (/^\d/.test(parts[0]) && parts.length >= 2) {
    return parts[1];
  }

  return parts[0];
}
