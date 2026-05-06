'use client';

import { Building2, Users, Bed, Bath } from 'lucide-react';

export type PropertyCardFeatureRowProps = {
  propertyType?: string;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  className?: string;
};

function guestLabel(n: number) {
  return `${n} ${n === 1 ? 'guest' : 'guests'}`;
}

function bedroomLabel(n: number) {
  return `${n} ${n === 1 ? 'bedroom' : 'bedrooms'}`;
}

function bathroomLabel(n: number) {
  return `${n} ${n === 1 ? 'bathroom' : 'bathrooms'}`;
}

/** Standard row: stay type, guests, bedrooms, bathrooms (matches listing detail / host card patterns). */
export function PropertyCardFeatureRow({
  propertyType,
  guests = 2,
  bedrooms = 1,
  bathrooms = 1,
  className = '',
}: PropertyCardFeatureRowProps) {
  const typeLabel = (propertyType || 'Property').trim() || 'Property';

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-muted text-sm ${className}`}>
      <span className="flex items-center gap-1.5 min-w-0">
        <Building2 className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
        <span className="truncate">{typeLabel}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Users className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
        {guestLabel(guests)}
      </span>
      <span className="flex items-center gap-1.5">
        <Bed className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
        {bedroomLabel(bedrooms)}
      </span>
      <span className="flex items-center gap-1.5">
        <Bath className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
        {bathroomLabel(bathrooms)}
      </span>
    </div>
  );
}
