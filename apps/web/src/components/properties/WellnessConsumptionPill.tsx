'use client';

type Props = {
  indoor: boolean;
  outdoor: boolean;
  className?: string;
};

/** 🌿 INDOOR / OUTDOOR pill — shown only when the host chose at least one on the listing. */
export function WellnessConsumptionPill({ indoor, outdoor, className = '' }: Props) {
  if (!indoor && !outdoor) return null;
  return (
    <div
      className={`bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 ${className}`}
      title="Wellness-friendly consumption areas"
    >
      <span className="text-lg shrink-0" aria-hidden>
        🌿
      </span>
      <div className="flex flex-col text-[10px] leading-tight font-bold text-white">
        {indoor && (
          <span className="flex items-center gap-1">
            INDOOR <span className="text-emerald-400">✓</span>
          </span>
        )}
        {outdoor && (
          <span className="flex items-center gap-1">
            OUTDOOR <span className="text-emerald-400">✓</span>
          </span>
        )}
      </div>
    </div>
  );
}
