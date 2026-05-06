/**
 * Derive a short city-style label from a property `location` string (often a full postal address).
 * Used for search filter suggestion lists so travellers see "Miami" instead of full street+ZIP+country.
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

  const stateRe = /^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/i;

  let i = parts.length - 1;
  if (/^(USA|United States(\s+of\s+America)?|US)$/i.test(parts[i])) {
    i -= 1;
  }

  if (i >= 0 && stateRe.test(parts[i])) {
    if (i >= 1) return parts[i - 1];
    return parts[0];
  }

  if (/^\d/.test(parts[0]) && parts.length >= 2) {
    return parts[1];
  }

  return parts[0];
}
