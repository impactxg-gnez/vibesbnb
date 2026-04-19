/** Derive smoking flags from DB + legacy smoke_friendly. */
export function resolveSmokingFlags(row: Record<string, unknown>): {
  inside: boolean;
  outside: boolean;
} {
  let inside =
    row.smoking_inside_allowed === true || row.smokingInsideAllowed === true;
  let outside =
    row.smoking_outside_allowed === true || row.smokingOutsideAllowed === true;
  if (!inside && !outside) {
    const legacy = row.smoke_friendly === true || row.smokeFriendly === true;
    if (legacy) outside = true;
  }
  return { inside, outside };
}
