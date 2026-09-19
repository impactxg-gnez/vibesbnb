import { propertyHasBalcony } from '@/lib/propertyAmenities';
import {
  isFully420Friendly,
  resolveConsumptionPolicy,
} from '@/lib/consumptionPolicy';
import { resolveWellnessConsumptionFlags } from '@/lib/wellnessConsumption';

const OUTDOOR_SPACE_RE =
  /patio|balcony|backyard|yard|terrace|deck|outdoor dining|outdoor furniture|outdoor kitchen|fire pit|hammock/i;

export type PropertyStayPolicies = {
  cannabisIndoor: boolean;
  cannabisOutdoor: boolean;
  /** Host explicitly allows cannabis in at least one area. */
  cannabisAllowed: boolean;
  /** Cannabis allowed both indoors and outdoors (Full Vibe / Balcony Vibe). */
  fullyCannabisFriendly: boolean;
  tobaccoIndoor: boolean;
  tobaccoOutdoor: boolean;
  tobaccoAllowed: boolean;
  hasPatioOrBalcony: boolean;
  hasPrivateOutdoorSpace: boolean;
};

function flag(row: Record<string, unknown>, snake: string, camel: string): boolean {
  return row[snake] === true || row[camel] === true;
}

/**
 * Read cannabis vs tobacco vs outdoor-space rules from the existing property row.
 * Does not invent 420-friendly from tobacco smoking flags.
 */
export function resolvePropertyStayPolicies(
  row: Record<string, unknown>
): PropertyStayPolicies {
  const cannabis = resolveWellnessConsumptionFlags(row);
  const tobaccoIndoor = flag(row, 'smoking_inside_allowed', 'smokingInsideAllowed');
  const tobaccoOutdoor = flag(row, 'smoking_outside_allowed', 'smokingOutsideAllowed');
  const smokeFriendly = flag(row, 'smoke_friendly', 'smokeFriendly');
  const amenities = Array.isArray(row.amenities) ? row.amenities : [];
  const hasPatioOrBalcony = propertyHasBalcony(amenities);
  const hasPrivateOutdoorSpace =
    hasPatioOrBalcony ||
    amenities.some((a) => OUTDOOR_SPACE_RE.test(String(a ?? '')));

  return {
    cannabisIndoor: cannabis.indoor,
    cannabisOutdoor: cannabis.outdoor,
    cannabisAllowed: cannabis.indoor || cannabis.outdoor,
    fullyCannabisFriendly: isFully420Friendly(cannabis.indoor, cannabis.outdoor),
    tobaccoIndoor,
    tobaccoOutdoor,
    tobaccoAllowed: tobaccoIndoor || tobaccoOutdoor || smokeFriendly,
    hasPatioOrBalcony,
    hasPrivateOutdoorSpace,
  };
}

export function cannabisPolicyLabel(policies: PropertyStayPolicies): string {
  if (policies.fullyCannabisFriendly) {
    return 'Cannabis consumption allowed indoors and outdoors';
  }
  if (policies.cannabisIndoor && !policies.cannabisOutdoor) {
    return 'Cannabis consumption allowed indoors only';
  }
  if (policies.cannabisOutdoor && !policies.cannabisIndoor) {
    return 'Cannabis consumption allowed outdoors only';
  }
  return 'Cannabis consumption is not listed as allowed';
}

export function tobaccoPolicyLabel(policies: PropertyStayPolicies): string {
  if (policies.tobaccoIndoor && policies.tobaccoOutdoor) {
    return 'Tobacco smoking allowed indoors and outdoors';
  }
  if (policies.tobaccoIndoor) return 'Tobacco smoking allowed indoors only';
  if (policies.tobaccoOutdoor) return 'Tobacco smoking allowed outdoors only';
  return 'Tobacco smoking is not listed as allowed';
}

export function outdoorSpaceLabel(policies: PropertyStayPolicies): string {
  if (policies.hasPatioOrBalcony && policies.hasPrivateOutdoorSpace) {
    return 'Patio or balcony listed';
  }
  if (policies.hasPrivateOutdoorSpace) return 'Outdoor space listed';
  return 'No patio, balcony, or private outdoor space listed';
}

/** Guest-facing wellness policy from the same flags the listing UI uses. */
export function listingConsumptionPolicy(row: Record<string, unknown>) {
  return resolveConsumptionPolicy(row);
}
