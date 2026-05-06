'use client';

import { Ban } from 'lucide-react';

function CigaretteAllowedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3" y="10" width="12" height="4" rx="2" fill="currentColor" />
      <rect x="15" y="10.75" width="6" height="2.5" rx="1" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

type SmokingPolicyPillProps = {
  inside: boolean;
  outside: boolean;
  className?: string;
};

/** INSIDE / OUTSIDE smoking pill — always shown: cigarette when allowed, ban icon when host allows neither. */
export function SmokingPolicyPill({ inside, outside, className = '' }: SmokingPolicyPillProps) {
  const allowed = inside || outside;
  return (
    <div
      className={`bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-amber-500/25 ${className}`}
      title={allowed ? 'Smoking policy: where allowed' : 'No smoking'}
    >
      {allowed ? (
        <CigaretteAllowedIcon className="w-4 h-4 shrink-0 text-amber-200" />
      ) : (
        <Ban className="w-4 h-4 shrink-0 text-zinc-200" strokeWidth={2.25} aria-hidden />
      )}
      <div className="flex flex-col text-[10px] leading-tight font-bold text-white">
        {allowed ? (
          <>
            {inside && (
              <span className="flex items-center gap-1">
                INSIDE <span className="text-amber-300">✓</span>
              </span>
            )}
            {outside && (
              <span className="flex items-center gap-1">
                OUTSIDE <span className="text-amber-300">✓</span>
              </span>
            )}
          </>
        ) : (
          <span className="tracking-wide">NO SMOKING</span>
        )}
      </div>
    </div>
  );
}
