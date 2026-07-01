'use client';

import Image from 'next/image';
import { shouldShowNewVibeBadge } from '@/lib/propertyNewVibe';

type PropertyCardRatingBadgeProps = {
  rating?: number | null;
  reviewCount?: number | null;
  /** True when a VibesBNB team review exists for the listing. */
  hasTeamReview?: boolean | null;
  createdAt?: string | null;
  className?: string;
  /** Compact badge for tight card headers */
  size?: 'sm' | 'md';
  /** Opens reviews modal; use stopPropagation when inside a link. */
  onClick?: () => void;
};

/**
 * Property cards: show average rating when reviewed, else "New Vibe" for listings under 30 days old.
 */
export function PropertyCardRatingBadge({
  rating,
  reviewCount,
  hasTeamReview,
  createdAt,
  className = '',
  size = 'sm',
  onClick,
}: PropertyCardRatingBadgeProps) {
  const reviews = reviewCount ?? 0;

  if (reviews > 0) {
    const display =
      rating != null && Number.isFinite(Number(rating)) && Number(rating) > 0
        ? Number(rating).toFixed(1)
        : '—';
    const interactive = Boolean(onClick);
    const Wrapper = interactive ? 'button' : 'div';
    return (
      <Wrapper
        type={interactive ? 'button' : undefined}
        onClick={
          interactive
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick?.();
              }
            : undefined
        }
        className={`flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg flex-shrink-0 ${
          interactive ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''
        } ${className}`}
        title={
          hasTeamReview
            ? 'Includes a VibesBNB team review — click to read'
            : interactive
              ? 'View reviews'
              : undefined
        }
        aria-label={interactive ? `View ${reviews} reviews` : undefined}
      >
        {hasTeamReview ? (
          <Image
            src="/logo.png"
            alt=""
            width={14}
            height={14}
            className="object-contain shrink-0"
            aria-hidden
          />
        ) : null}
        <span className="text-primary-500 text-xs" aria-hidden>
          ★
        </span>
        <span className="text-xs font-bold text-white">{display}</span>
      </Wrapper>
    );
  }

  if (!shouldShowNewVibeBadge(createdAt, reviews)) {
    return null;
  }

  const logoSize = size === 'md' ? 18 : 16;
  const textClass = size === 'md' ? 'text-xs' : 'text-[11px]';

  return (
    <div
      className={`flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-lg flex-shrink-0 ${className}`}
      title="Listed within the last 30 days"
    >
      <Image
        src="/logo.png"
        alt=""
        width={logoSize}
        height={logoSize}
        className="object-contain shrink-0"
        aria-hidden
      />
      <span className={`${textClass} font-bold text-emerald-400 whitespace-nowrap tracking-tight`}>
        New Vibe
      </span>
    </div>
  );
}
