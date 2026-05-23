'use client';

import Image from 'next/image';
import { Star } from 'lucide-react';
import { shouldShowNewVibeBadge } from '@/lib/propertyNewVibe';

type PropertyListingRatingProps = {
  rating: number;
  reviewCount: number;
  createdAt?: string | null;
  onClick?: () => void;
  starSize?: number;
  className?: string;
};

/** Listing detail / booking sidebar: rating, New Vibe, or review count. */
export function PropertyListingRating({
  rating,
  reviewCount,
  createdAt,
  onClick,
  starSize = 18,
  className = '',
}: PropertyListingRatingProps) {
  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? {
        type: 'button' as const,
        onClick,
        className: `flex items-center gap-2 text-left hover:text-emerald-400 transition-colors focus:outline-none ${className}`,
      }
    : { className: `flex items-center gap-2 ${className}` };

  if (reviewCount > 0) {
    return (
      <Wrapper {...wrapperProps}>
        <Star
          size={starSize}
          className="text-primary-500 fill-primary-500 shrink-0"
          aria-hidden
        />
        <span className="text-white font-semibold">{rating}</span>
        <span className="text-sm text-gray-400">
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      </Wrapper>
    );
  }

  if (shouldShowNewVibeBadge(createdAt, reviewCount)) {
    return (
      <Wrapper {...wrapperProps}>
        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg">
          <Image src="/logo.png" alt="" width={16} height={16} className="object-contain" aria-hidden />
          <span className="text-sm font-bold text-emerald-400">New Vibe</span>
        </span>
        <span className="text-sm text-gray-500">(No reviews yet)</span>
      </Wrapper>
    );
  }

  return (
    <Wrapper {...wrapperProps}>
      <Star size={starSize} className="text-gray-600 shrink-0" aria-hidden />
      <span className="text-white font-semibold">—</span>
      <span className="text-sm text-gray-400">(No reviews yet)</span>
    </Wrapper>
  );
}
