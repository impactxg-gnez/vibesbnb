import { resolveWellnessConsumptionFlags } from '@/lib/wellnessConsumption';

export type LocationPolicy = {
  inside: boolean;
  outside: boolean;
};

export type ConsumptionPolicy = {
  cannabis: LocationPolicy;
};

export type LocationPolicyLabel =
  | 'Not allowed'
  | 'Outside only'
  | 'Inside only'
  | 'Inside & outside';

/** Green glow for listings that allow 420 both inside and outside. */
export const FULLY_420_GLOW_CLASS =
  'ring-2 ring-emerald-400/70 border-emerald-400/50 shadow-[0_0_28px_rgba(16,185,129,0.55),0_0_64px_rgba(52,211,153,0.28)]';

export function resolveConsumptionPolicy(row: Record<string, unknown>): ConsumptionPolicy {
  const cannabis = resolveWellnessConsumptionFlags(row);
  return {
    cannabis: { inside: cannabis.indoor, outside: cannabis.outdoor },
  };
}

export function locationPolicyLabel(policy: LocationPolicy): LocationPolicyLabel {
  const { inside, outside } = policy;
  if (!inside && !outside) return 'Not allowed';
  if (inside && outside) return 'Inside & outside';
  if (inside) return 'Inside only';
  return 'Outside only';
}

export function cannabisShortLabel(policy: LocationPolicy): string {
  const label = locationPolicyLabel(policy);
  if (label === 'Not allowed') return 'No 420';
  if (label === 'Outside only') return '420: outside only';
  if (label === 'Inside only') return '420: inside only';
  return '420: inside & outside';
}

/** Completely 420-friendly: cannabis allowed inside and outside. */
export function isFully420Friendly(inside: boolean, outside: boolean): boolean {
  return inside === true && outside === true;
}

export function isFully420FromPolicy(policy: ConsumptionPolicy): boolean {
  return isFully420Friendly(policy.cannabis.inside, policy.cannabis.outside);
}

/** True when 420 is not allowed anywhere. */
export function is420FreeProperty(policy: ConsumptionPolicy): boolean {
  const c = policy.cannabis;
  return !c.inside && !c.outside;
}

export function no420SummaryLabel(policy: ConsumptionPolicy): string | null {
  if (!is420FreeProperty(policy)) return null;
  return 'No 420 on this property';
}

export type ConsumptionPolicyFormState = {
  cannabisAllowed: boolean;
  cannabisInside: boolean;
  cannabisOutside: boolean;
};

export function consumptionPolicyToForm(policy: ConsumptionPolicy): ConsumptionPolicyFormState {
  const cannabisAllowed = policy.cannabis.inside || policy.cannabis.outside;
  return {
    cannabisAllowed,
    cannabisInside: policy.cannabis.inside,
    cannabisOutside: policy.cannabis.outside,
  };
}

/** Normalize form → DB flags. If allowed but no location picked, default to outside. */
export function formToConsumptionFlags(form: ConsumptionPolicyFormState): {
  wellness_consumption_indoor_allowed: boolean;
  wellness_consumption_outdoor_allowed: boolean;
  smoking_inside_allowed: boolean;
  smoking_outside_allowed: boolean;
  smoke_friendly: boolean;
  wellness_friendly_from_cannabis: boolean;
} {
  let cannabisInside = form.cannabisAllowed && form.cannabisInside;
  let cannabisOutside = form.cannabisAllowed && form.cannabisOutside;
  if (form.cannabisAllowed && !cannabisInside && !cannabisOutside) {
    cannabisOutside = true;
  }

  return {
    wellness_consumption_indoor_allowed: cannabisInside,
    wellness_consumption_outdoor_allowed: cannabisOutside,
    // Cigarette smoking removed from product — always clear on write.
    smoking_inside_allowed: false,
    smoking_outside_allowed: false,
    smoke_friendly: false,
    wellness_friendly_from_cannabis: cannabisInside || cannabisOutside,
  };
}
