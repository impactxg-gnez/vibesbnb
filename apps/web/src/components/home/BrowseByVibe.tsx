'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

/**
 * IDs must match SearchSection / Filters `categories` and `propertySearchFilters` chips.
 * URL: /search?categories=Entire+House (comma-separated if multiple elsewhere).
 */
const propertyTypes = [
  {
    categoryId: 'Entire House',
    label: 'Entire House',
    image:
      'https://images.unsplash.com/photo-1564013796919-e39a4a222a82?w=400&h=300&fit=crop&q=80',
  },
  {
    categoryId: 'Apartment',
    label: 'Apartment',
    image:
      'https://images.unsplash.com/photo-1545327418-30d4042c0d0e?w=400&h=300&fit=crop&q=80',
  },
  {
    categoryId: 'Condo',
    label: 'Condos',
    image:
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=300&fit=crop&q=80',
  },
  {
    categoryId: 'Private Rooms',
    label: 'Private Rooms',
    image:
      'https://images.unsplash.com/photo-1631049307264-da42cfb72e8d?w=400&h=300&fit=crop&q=80',
  },
  {
    categoryId: 'Room inside property',
    label: 'Shared Rooms',
    image:
      'https://images.unsplash.com/photo-1522708323599-d24dbb423b9d?w=400&h=300&fit=crop&q=80',
  },
] as const;

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
        {propertyTypes.map((item, index) => (
          <motion.div
            key={item.categoryId}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.08 }}
          >
            <Link
              href={searchHref(item.categoryId)}
              className="group block relative h-36 sm:h-44 md:h-48 rounded-2xl sm:rounded-[2rem] overflow-hidden border border-white/5 hover:border-primary-500/30 transition-all duration-500"
            >
              <Image
                src={item.image}
                alt={item.label}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover group-hover:scale-125 transition duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent group-hover:from-primary-950/90 transition-colors duration-500" />
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6">
                <h3 className="text-white font-bold text-base sm:text-xl mb-1 group-hover:text-primary-500 transition-colors leading-tight">
                  {item.label}
                </h3>
                <div className="w-8 h-1 bg-primary-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
