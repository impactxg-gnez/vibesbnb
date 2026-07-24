/**
 * Derive a short city + state label from a property `location` string (often a full postal address).
 * Used for search filter suggestion lists so travellers see "Fort Lauderdale, FL"
 * instead of full street+ZIP+country.
 */
export function cityLabelFromPropertyLocation(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';

  const parts = s
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  // "FL", "FL 33301", "fl 33301-1234"
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

  // Street-first addresses without a clear state token: prefer the second segment as city
  if (/^\d/.test(parts[0]) && parts.length >= 2) {
    return parts[1];
  }

  return parts[0];
}
