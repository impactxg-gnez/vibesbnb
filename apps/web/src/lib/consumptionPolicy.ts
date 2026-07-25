import { resolveSmokingFlags } from '@/lib/propertySmoking';
import { resolveWellnessConsumptionFlags } from '@/lib/wellnessConsumption';

export type LocationPolicy = {
  inside: boolean;
  outside: boolean;
};

export type ConsumptionPolicy = {
  cannabis: LocationPolicy;
  cigarettes: LocationPolicy;
};

export type LocationPolicyLabel =
  | 'Not allowed'
  | 'Outside only'
  | 'Inside only'
  | 'Inside & outside';

export function resolveConsumptionPolicy(row: Record<string, unknown>): ConsumptionPolicy {
  const cannabis = resolveWellnessConsumptionFlags(row);
  const cigarettes = resolveSmokingFlags(row);
  return {
    cannabis: { inside: cannabis.indoor, outside: cannabis.outdoor },
    cigarettes: { inside: cigarettes.inside, outside: cigarettes.outside },
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

export function cigarettesShortLabel(policy: LocationPolicy): string {
  const label = locationPolicyLabel(policy);
  if (label === 'Not allowed') return 'No cigarettes';
  if (label === 'Outside only') return 'Cigarettes: outside only';
  if (label === 'Inside only') return 'Cigarettes: inside only';
  return 'Cigarettes: inside & outside';
}

/** True when neither 420 nor cigarettes are allowed anywhere. */
export function isSmokeFreeProperty(policy: ConsumptionPolicy): boolean {
  const c = policy.cannabis;
  const s = policy.cigarettes;
  return !c.inside && !c.outside && !s.inside && !s.outside;
}

export function smokeFreeSummaryLabel(policy: ConsumptionPolicy): string | null {
  if (!isSmokeFreeProperty(policy)) return null;
  return 'Smoke-free (no 420, no cigarettes)';
}

export type ConsumptionPolicyFormState = {
  cannabisAllowed: boolean;
  cannabisInside: boolean;
  cannabisOutside: boolean;
  cigarettesAllowed: boolean;
  cigarettesInside: boolean;
  cigarettesOutside: boolean;
};

export function consumptionPolicyToForm(policy: ConsumptionPolicy): ConsumptionPolicyFormState {
  const cannabisAllowed = policy.cannabis.inside || policy.cannabis.outside;
  const cigarettesAllowed = policy.cigarettes.inside || policy.cigarettes.outside;
  return {
    cannabisAllowed,
    cannabisInside: policy.cannabis.inside,
    cannabisOutside: policy.cannabis.outside,
    cigarettesAllowed,
    cigarettesInside: policy.cigarettes.inside,
    cigarettesOutside: policy.cigarettes.outside,
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

  let cigarettesInside = form.cigarettesAllowed && form.cigarettesInside;
  let cigarettesOutside = form.cigarettesAllowed && form.cigarettesOutside;
  if (form.cigarettesAllowed && !cigarettesInside && !cigarettesOutside) {
    cigarettesOutside = true;
  }

  return {
    wellness_consumption_indoor_allowed: cannabisInside,
    wellness_consumption_outdoor_allowed: cannabisOutside,
    smoking_inside_allowed: cigarettesInside,
    smoking_outside_allowed: cigarettesOutside,
    smoke_friendly: cigarettesInside || cigarettesOutside,
    wellness_friendly_from_cannabis: cannabisInside || cannabisOutside,
  };
}
