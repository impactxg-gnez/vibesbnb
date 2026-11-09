import { setBalconyAmenity } from '@/lib/propertyAmenities';

/**
 * Buildings that cannot offer wellness consumption or a balcony
 * (v2 amendment Section C — e.g. District 225).
 */
export const WELLNESS_LOCKED_BUILDINGS = [
  {
    id: 'district-225',
    label: 'District 225',
    match: /\bdistrict\s*225\b/i,
  },
] as const;

export type LockedBuilding = (typeof WELLNESS_LOCKED_BUILDINGS)[number];

function haystack(row: {
  name?: unknown;
  title?: unknown;
  location?: unknown;
}): string {
  return [row.name, row.title, row.location]
    .map((v) => String(v || ''))
    .join(' ');
}

export function matchLockedBuilding(row: {
  name?: unknown;
  title?: unknown;
  location?: unknown;
}): LockedBuilding | null {
  const text = haystack(row);
  if (!text.trim()) return null;
  return WELLNESS_LOCKED_BUILDINGS.find((b) => b.match.test(text)) ?? null;
}

export function buildingWellnessLockMessage(building: LockedBuilding): string {
  return `${building.label} cannot list wellness consumption or a balcony. Those options stay off for this building.`;
}

/** Overlay wellness/balcony fields so a locked building cannot persist or display them. */
export function applyBuildingWellnessLock(
  row: Record<string, unknown>
): Record<string, unknown> {
  const building = matchLockedBuilding(row);
  if (!building) return row;
  return {
    ...row,
    wellness_friendly: false,
    wellnessFriendly: false,
    wellness_consumption_indoor_allowed: false,
    wellnessConsumptionIndoorAllowed: false,
    wellness_consumption_outdoor_allowed: false,
    wellnessConsumptionOutdoorAllowed: false,
    amenities: setBalconyAmenity(row.amenities, false),
  };
}
