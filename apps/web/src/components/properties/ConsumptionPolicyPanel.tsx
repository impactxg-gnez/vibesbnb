'use client';

import {
  type ConsumptionPolicy,
  isSmokeFreeProperty,
  locationPolicyLabel,
  smokeFreeSummaryLabel,
} from '@/lib/consumptionPolicy';

type Props = {
  policy: ConsumptionPolicy;
  className?: string;
};

function PolicyRow({
  label,
  inside,
  outside,
  accentClass,
}: {
  label: string;
  inside: boolean;
  outside: boolean;
  accentClass: string;
}) {
  const status = locationPolicyLabel({ inside, outside });
  const allowed = inside || outside;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/10 last:border-0">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        {allowed && (
          <p className="text-xs text-gray-400 mt-1">
            {[inside ? 'Inside' : null, outside ? 'Outside (balcony / patio / yard)' : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
      <span
        className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${
          allowed
            ? `${accentClass}`
            : 'bg-zinc-800/80 border-zinc-600 text-zinc-300'
        }`}
      >
        {status}
      </span>
    </div>
  );
}

/** Traveller-facing: always show both 420 and cigarette rules. */
export function ConsumptionPolicyPanel({ policy, className = '' }: Props) {
  const smokeFree = smokeFreeSummaryLabel(policy);

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-2 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 pt-2 pb-1">
        <h3 className="text-sm font-bold text-white tracking-wide uppercase">
          Smoking &amp; 420 policy
        </h3>
        {isSmokeFreeProperty(policy) && smokeFree && (
          <span className="text-[11px] font-semibold text-emerald-300">{smokeFree}</span>
        )}
      </div>
      <PolicyRow
        label="420 / cannabis"
        inside={policy.cannabis.inside}
        outside={policy.cannabis.outside}
        accentClass="bg-emerald-900/50 border-emerald-500/50 text-emerald-200"
      />
      <PolicyRow
        label="Cigarettes"
        inside={policy.cigarettes.inside}
        outside={policy.cigarettes.outside}
        accentClass="bg-amber-900/40 border-amber-500/40 text-amber-100"
      />
    </div>
  );
}
