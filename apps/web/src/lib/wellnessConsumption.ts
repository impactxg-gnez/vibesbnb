/** Wellness / consumption area flags persisted on properties (guest-facing carousel pill). */

import { matchLockedBuilding } from '@/lib/buildingWellnessLock';

export function resolveWellnessConsumptionFlags(row: Record<string, unknown>): {
  indoor: boolean;
  outdoor: boolean;
} {
  if (matchLockedBuilding(row)) {
    return { indoor: false, outdoor: false };
  }
  const indoor =
    row.wellness_consumption_indoor_allowed === true ||
    row.wellnessConsumptionIndoorAllowed === true;
  const outdoor =
    row.wellness_consumption_outdoor_allowed === true ||
    row.wellnessConsumptionOutdoorAllowed === true;
  return { indoor, outdoor };
}
