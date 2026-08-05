'use client';

import {
  type ConsumptionPolicy,
  is420FreeProperty,
  isFully420FromPolicy,
  locationPolicyLabel,
  no420SummaryLabel,
  FULLY_420_GLOW_CLASS,
} from '@/lib/consumptionPolicy';

type Props = {
  policy: ConsumptionPolicy;
  className?: string;
};

/** Traveller-facing 420 / cannabis house rules. */
export function ConsumptionPolicyPanel({ policy, className = '' }: Props) {
  const summary = no420SummaryLabel(policy);
  const fullyFriendly = isFully420FromPolicy(policy);
  const { inside, outside } = policy.cannabis;
  const status = locationPolicyLabel({ inside, outside });
  const allowed = inside || outside;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-2 ${
        fullyFriendly ? FULLY_420_GLOW_CLASS : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 pt-2 pb-1">
        <h3 className="text-sm font-bold text-white tracking-wide uppercase">420 policy</h3>
        {fullyFriendly ? (
          <span className="text-[11px] font-semibold text-emerald-300">Fully 420-friendly</span>
        ) : is420FreeProperty(policy) && summary ? (
          <span className="text-[11px] font-semibold text-zinc-400">{summary}</span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">420 / cannabis</p>
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
              ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-200'
              : 'bg-zinc-800/80 border-zinc-600 text-zinc-300'
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
