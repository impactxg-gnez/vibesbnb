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
        className={`inline-flex items-center gap-1.5 truncate rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-gray-200 hover:border-primary-500/40 hover:text-primary-400 transition ${
          fullWidth ? 'w-full justify-between max-w-none' : 'max-w-[11rem]'
        }`}
      >
        <span className="truncate">{activeLabel ? activeLabel : 'Choose your Vibe'}</span>
        <ChevronDown size={14} className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-[80] mt-2 rounded-2xl border border-primary-500/20 bg-gray-950 py-2 shadow-2xl ${
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
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
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
