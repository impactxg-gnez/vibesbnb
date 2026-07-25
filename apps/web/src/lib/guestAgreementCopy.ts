import {
  type ConsumptionPolicy,
  cannabisShortLabel,
  cigarettesShortLabel,
  isSmokeFreeProperty,
  resolveConsumptionPolicy,
} from '@/lib/consumptionPolicy';

function policyLine(label: string, inside: boolean, outside: boolean): string {
  if (!inside && !outside) {
    return `${label} is not allowed at this property.`;
  }
  const places = [
    inside ? 'inside' : null,
    outside ? 'outside (balcony / patio / yard)' : null,
  ].filter(Boolean);
  return `${label} is allowed ${places.join(' and ')} only where permitted by the host and applicable law; follow any designated areas in the listing and host documents.`;
}

/** Platform-wide rules copy shown on every booking; host PDF may add further terms. */
export function buildGuestAgreementNotice(opts: {
  propertyName: string;
  policy?: ConsumptionPolicy;
  /** Raw property row — used when `policy` is omitted. */
  propertyRow?: Record<string, unknown>;
  /** @deprecated Prefer `policy` or `propertyRow`. */
  smokingInsideAllowed?: boolean;
  hostAgreementUrl: string | null;
}) {
  const { propertyName, hostAgreementUrl } = opts;

  let policy: ConsumptionPolicy;
  if (opts.policy) {
    policy = opts.policy;
  } else if (opts.propertyRow) {
    policy = resolveConsumptionPolicy(opts.propertyRow);
  } else {
    policy = {
      cannabis: { inside: false, outside: false },
      cigarettes: {
        inside: opts.smokingInsideAllowed === true,
        outside: false,
      },
    };
  }

  const consumptionBullets = isSmokeFreeProperty(policy)
    ? [
        `This stay is smoke-free: ${cannabisShortLabel(policy.cannabis).toLowerCase()} and ${cigarettesShortLabel(policy.cigarettes).toLowerCase()}.`,
      ]
    : [
        policyLine('420 / cannabis consumption', policy.cannabis.inside, policy.cannabis.outside),
        policyLine('Cigarette smoking', policy.cigarettes.inside, policy.cigarettes.outside),
      ];

  return {
    title: 'House rules & guest agreement',
    bullets: [
      `You are booking "${propertyName}" and agree to follow all building and house rules stated by the host and VibesBNB.`,
      ...consumptionBullets,
      'You accept responsibility for your guests’ compliance with these rules; violations may lead to cancellation, fees, or liability.',
      'You understand the host depends on accurate guest counts, respectful behavior, and adherence to safety rules to maintain their license and insurance.',
      hostAgreementUrl
        ? 'The host has provided an additional written agreement (PDF). You must review and accept it together with these terms before submitting your request.'
        : 'Where the host later provides a written addendum, you agree to follow those terms as communicated before check-in.',
    ] as string[],
  };
}
