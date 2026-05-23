'use client';

import Image from 'next/image';
import { hostBadgeLabel, type HostBadge } from '@/lib/hostBadge';

type HostStatusBadgeProps = {
  badge: HostBadge;
  className?: string;
  size?: 'sm' | 'md';
};

/**
 * SuperBud — top hosts with strong reviews (or grandfathered existing hosts).
 * VibeSetter — new hosts building their reputation.
 */
export function HostStatusBadge({
  badge,
  className = '',
  size = 'sm',
}: HostStatusBadgeProps) {
  const isSuperBud = badge === 'superbud';
  const logoSize = size === 'md' ? 18 : 16;
  const textClass = size === 'md' ? 'text-xs' : 'text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-bold whitespace-nowrap tracking-tight border ${className} ${
        isSuperBud
          ? 'bg-amber-500/15 border-amber-400/35 text-amber-300'
          : 'bg-sky-500/10 border-sky-400/30 text-sky-300'
      }`}
      title={
        isSuperBud
          ? 'SuperBud — trusted host with excellent guest reviews'
          : 'VibeSetter — new host on VibesBNB'
      }
    >
      <Image
        src="/logo.png"
        alt=""
        width={logoSize}
        height={logoSize}
        className="object-contain shrink-0"
        aria-hidden
      />
      <span className={textClass}>{hostBadgeLabel(badge)}</span>
    </span>
  );
}
