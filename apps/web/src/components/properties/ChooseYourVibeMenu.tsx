'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Bed, Building, Home } from 'lucide-react';
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

type Props = {
  hrefBase?: string;
  activeCategory: string | null;
  className?: string;
  /** Stretch trigger across the header second row on phones */
  fullWidth?: boolean;
};

/** Compact mobile/tablet control — expands to category links. */
export function ChooseYourVibeMenu({
  hrefBase = '/search',
  activeCategory,
  className = '',
  fullWidth = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const activeLabel =
    HEADER_PROPERTY_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? null;

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1.5 truncate rounded-full border border-[#51372B]/20 bg-[#F4E6D4] px-3 py-2 text-xs font-bold text-[#193F25] hover:border-[#193F25]/40 hover:text-[#122B1A] transition dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-primary-500/40 dark:hover:text-primary-400 ${
          fullWidth ? 'w-full justify-between max-w-none' : 'max-w-[11rem]'
        }`}
      >
        <span className="truncate">{activeLabel ? activeLabel : 'Choose your Vibe'}</span>
        <ChevronDown size={14} className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-[80] mt-2 rounded-2xl border border-[#51372B]/15 bg-[#FAF3EA] py-2 shadow-[0_15px_40px_rgba(81,55,43,0.16)] dark:border-primary-500/20 dark:bg-gray-950 dark:shadow-2xl ${
            fullWidth
              ? 'left-0 right-0 w-full'
              : 'left-1/2 w-52 -translate-x-1/2'
          }`}
        >
          {HEADER_PROPERTY_CATEGORIES.map((chip) => {
            const Icon = CHIP_ICONS[chip.id];
            const isActive = activeCategory === chip.id;
            return (
              <Link
                key={chip.id}
                href={chipHref(hrefBase, chip.id, activeCategory)}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-[#193F25]/10 text-[#193F25] dark:bg-primary-500/15 dark:text-primary-400'
                    : 'text-[#51372B] hover:bg-[#ECD5BB] hover:text-[#193F25] dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-primary-400' : 'text-gray-500'} />
                {chip.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
