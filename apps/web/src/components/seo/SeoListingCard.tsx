import Link from 'next/link';
import Image from 'next/image';
import { formatPublicLocation } from '@/lib/propertyLocationPrivacy';
import { cannabisPolicyLabel, resolvePropertyStayPolicies } from '@/lib/seo/propertyStayPolicies';
import type { SeoPropertyCard } from '@/lib/seo/publicProperties';

type Props = {
  property: SeoPropertyCard;
};

export function SeoListingCard({ property }: Props) {
  const href = `/listings/${property.id}`;
  const img =
    property.coverImage ||
    property.images.find((u) => /^https?:\/\//i.test(u)) ||
    `/api/properties/${encodeURIComponent(property.id)}/cover`;
  const policies = resolvePropertyStayPolicies({
    amenities: property.amenities,
    wellness_consumption_indoor_allowed: property.cannabisIndoor,
    wellness_consumption_outdoor_allowed: property.cannabisOutdoor,
    smoking_inside_allowed: property.tobaccoIndoor,
    smoking_outside_allowed: property.tobaccoOutdoor,
    smoke_friendly: property.tobaccoAllowed,
  });
  const location = property.publicLocation || formatPublicLocation(property.location);
  const facts = [
    property.guests != null ? `${property.guests} guests` : null,
    property.bedrooms != null ? `${property.bedrooms} bedrooms` : null,
    property.bathrooms != null ? `${property.bathrooms} bathrooms` : null,
    property.hasPatioOrBalcony ? 'Patio or balcony' : null,
  ].filter(Boolean);

  return (
    <article className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden hover:border-primary-500/40 transition-colors">
      <Link href={href} className="block">
        <div className="relative h-48 bg-gray-800">
          <Image
            src={img}
            alt={`${property.name} in ${location || 'Miami'}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized={img.startsWith('/api/')}
          />
        </div>
        <div className="p-4 space-y-2">
          <h3 className="text-white font-semibold leading-snug">{property.name}</h3>
          {location ? <p className="text-sm text-gray-400">{location}</p> : null}
          {facts.length > 0 ? (
            <p className="text-xs text-gray-500">{facts.join(' · ')}</p>
          ) : null}
          <p className="text-xs text-emerald-300/90">{cannabisPolicyLabel(policies)}</p>
        </div>
      </Link>
    </article>
  );
}
