'use client';

import {
  type ConsumptionPolicy,
  is420FreeProperty,
  isFully420FromPolicy,
  locationPolicyLabel,
  no420SummaryLabel,
  resolveVibeMarker,
  FULL_VIBE_NAME,
  BALCONY_VIBE_NAME,
} from '@/lib/consumptionPolicy';
import { VibeMarkerBadge } from '@/components/properties/VibeMarkerBadge';

type Props = {
  policy: ConsumptionPolicy;
  hasBalcony?: boolean;
  className?: string;
};

/** Traveller-facing 420 / cannabis house rules. */
export function ConsumptionPolicyPanel({
  policy,
  hasBalcony = false,
  className = '',
}: Props) {
  const summary = no420SummaryLabel(policy);
  const fullyFriendly = isFully420FromPolicy(policy);
  const { inside, outside } = policy.cannabis;
  const status = locationPolicyLabel({ inside, outside });
  const allowed = inside || outside;
  const vibeMarker = resolveVibeMarker({
    cannabisInside: inside,
    cannabisOutside: outside,
    hasBalcony,
  });

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-2 ${
        vibeMarker ? vibeMarker.glowClass : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 pt-2 pb-1">
        <h3 className="text-sm font-bold text-white tracking-wide uppercase">Wellness policy</h3>
        {vibeMarker ? (
          <VibeMarkerBadge marker={vibeMarker} size="sm" />
        ) : is420FreeProperty(policy) && summary ? (
          <span className="text-[11px] font-semibold text-zinc-400">{summary}</span>
        ) : fullyFriendly ? (
          <span className="text-[11px] font-semibold text-emerald-300">{FULL_VIBE_NAME}</span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Wellness consumption</p>
          {allowed && (
            <p className="text-xs text-gray-400 mt-1">
              {[inside ? 'Inside' : null, outside ? 'Outside (balcony / patio / yard)' : null]
                .filter(Boolean)
                .join(' · ')}
              {hasBalcony && fullyFriendly
                ? ` · ${BALCONY_VIBE_NAME} listing`
                : fullyFriendly
                  ? ` · ${FULL_VIBE_NAME} listing`
                  : ''}
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
