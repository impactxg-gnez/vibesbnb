'use client';

import { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { PropertyMap } from '@/components/PropertyMap';

type Props = {
  latitude: number;
  longitude: number;
  propertyName: string;
  approximateRadiusMeters: number;
};

const PRIVACY_NOTE = 'Approximate area only. Exact address is shared after booking confirmation.';

/**
 * Phones get a collapsed card with a zoom-only map: a pannable map inside a scrolling page
 * captures the swipe and drags the map instead of scrolling the listing.
 */
export function ListingLocationCard({
  latitude,
  longitude,
  propertyName,
  approximateRadiusMeters,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="md:hidden rounded-xl overflow-hidden border border-[#193F25]/20 bg-[#FAF3EA] dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin size={16} className="shrink-0 text-emerald-600 dark:text-emerald-500" />
            <span className="truncate text-sm font-semibold text-[#193F25] dark:text-white">
              Approximate location
            </span>
          </span>
          <ChevronDown
            size={20}
            className={`shrink-0 text-[#193F25]/60 transition-transform dark:text-gray-400 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {open && (
          <div className="px-3 pb-3">
            <div className="h-72 overflow-hidden rounded-lg border border-[#193F25]/15 dark:border-gray-800">
              <PropertyMap
                latitude={latitude}
                longitude={longitude}
                propertyName={propertyName}
                approximateRadiusMeters={approximateRadiusMeters}
                zoomOnly
              />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[#193F25]/70 dark:text-gray-400">
              {PRIVACY_NOTE} Use the + and − buttons to zoom.
            </p>
          </div>
        )}
      </div>

      <div className="relative hidden overflow-hidden rounded-xl border border-gray-800 md:block md:h-[500px]">
        <PropertyMap
          latitude={latitude}
          longitude={longitude}
          propertyName={propertyName}
          approximateRadiusMeters={approximateRadiusMeters}
        />
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-gray-700 bg-gray-900/90 px-4 py-3 backdrop-blur-sm">
          <p className="flex items-center gap-2 text-sm text-gray-300">
            <MapPin size={16} className="flex-shrink-0 text-emerald-500" />
            <span>{PRIVACY_NOTE}</span>
          </p>
        </div>
      </div>
    </>
  );
}
