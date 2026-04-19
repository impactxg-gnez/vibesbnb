'use client';

import type { LucideIcon } from 'lucide-react';
import { Home, Building2, Landmark, Bed, UsersRound } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

/**
 * IDs must match SearchSection / Filters `categories` and `propertySearchFilters` chips.
 * URL: /search?categories=Entire+House (comma-separated if multiple elsewhere).
 */
const propertyTypes: {
  categoryId: string;
  label: string;
  Icon: LucideIcon;
}[] = [
  { categoryId: 'Entire House', label: 'Entire House', Icon: Home },
  { categoryId: 'Apartment', label: 'Apartment', Icon: Building2 },
  { categoryId: 'Condo', label: 'Condos', Icon: Landmark },
  { categoryId: 'Private Rooms', label: 'Private Rooms', Icon: Bed },
  { categoryId: 'Room inside property', label: 'Shared Rooms', Icon: UsersRound },
];

function searchHref(categoryId: string) {
  const params = new URLSearchParams();
  params.set('categories', categoryId);
  return `/search?${params.toString()}`;
}

export function BrowseByVibe() {
  return (
    <div className="container mx-auto px-4 sm:px-6 pb-24">
      <div className="flex items-center justify-between mb-6 sm:mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Browse by <span className="text-primary-500 italic">Type</span>
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
        {propertyTypes.map((item, index) => {
          const Icon = item.Icon;
          return (
            <motion.div
              key={item.categoryId}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
            >
              <Link
                href={searchHref(item.categoryId)}
                className="group block relative h-36 sm:h-44 md:h-48 rounded-2xl sm:rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-br from-gray-900/90 via-black to-gray-950 hover:border-primary-500/40 transition-all duration-500 shadow-lg shadow-black/40"
              >
                <div
                  className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,230,118,0.12),transparent_55%)]"
                  aria-hidden
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pb-10 sm:pb-12 px-3">
                  <div className="rounded-2xl bg-primary-500/10 p-4 sm:p-5 ring-1 ring-primary-500/25 shadow-[0_0_32px_rgba(0,230,118,0.08)] group-hover:bg-primary-500/15 group-hover:ring-primary-500/45 group-hover:shadow-[0_0_40px_rgba(0,230,118,0.15)] transition-all duration-500">
                    <Icon
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-primary-500 group-hover:text-primary-400 transition-colors"
                      strokeWidth={1.35}
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6 z-[1]">
                  <h3 className="text-white font-bold text-base sm:text-xl mb-1 group-hover:text-primary-500 transition-colors leading-tight">
                    {item.label}
                  </h3>
                  <div className="w-8 h-1 bg-primary-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
