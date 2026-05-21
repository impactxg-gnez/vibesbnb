'use client';

import Link from 'next/link';
import { Bed, Building, Home } from 'lucide-react';
import {
  HEADER_PROPERTY_CATEGORIES,
  type HeaderPropertyCategory,
} from '@/lib/propertySearchFilters';

const CHIP_ICONS: Record<HeaderPropertyCategory, typeof Bed> = {
  '1-bed': Bed,
  '2-bed': Bed,
  studios: Building,
  condo: Home,
};

function chipHref(hrefBase: string, categoryId: HeaderPropertyCategory, activeCategory: string | null) {
  if (activeCategory === categoryId) return hrefBase;
  const sep = hrefBase.includes('?') ? '&' : '?';
  return `${hrefBase}${sep}category=${categoryId}`;
}

type PropertyCategoryChipsProps = {
  hrefBase: string;
  activeCategory: string | null;
  className?: string;
};

/** Pill filters shared by the header nav and host profile listings (1 Bed, 2 Bed, Studios, Condos). */
export function PropertyCategoryChips({
  hrefBase,
  activeCategory,
  className = '',
}: PropertyCategoryChipsProps) {
  const bedChips = HEADER_PROPERTY_CATEGORIES.filter((c) => c.id === '1-bed' || c.id === '2-bed');
  const typeChips = HEADER_PROPERTY_CATEGORIES.filter((c) => c.id === 'studios' || c.id === 'condo');

  const renderGroup = (chips: typeof HEADER_PROPERTY_CATEGORIES) => (
    <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-2 py-1.5 shadow-inner">
      {chips.map((chip, index) => {
        const Icon = CHIP_ICONS[chip.id];
        const isActive = activeCategory === chip.id;
        return (
          <span key={chip.id} className="flex items-center">
            {index > 0 && <div className="w-px h-5 bg-white/10 mx-1" />}
            <Link
              href={chipHref(hrefBase, chip.id, activeCategory)}
              className={`px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                isActive
                  ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 group'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-black' : 'text-gray-500'
                }`}
              />
              {chip.label}
            </Link>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {renderGroup(bedChips)}
      {renderGroup(typeChips)}
    </div>
  );
}
