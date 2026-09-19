import Link from 'next/link';
import {
  cannabisPolicyLabel,
  outdoorSpaceLabel,
  resolvePropertyStayPolicies,
  tobaccoPolicyLabel,
} from '@/lib/seo/propertyStayPolicies';
import { parsePropertyPlace } from '@/lib/seo/propertyPlace';
import type { SeoPropertyCard } from '@/lib/seo/publicProperties';

type Props = {
  property: SeoPropertyCard;
};

export function PropertySeoFacts({ property }: Props) {
  const policies = resolvePropertyStayPolicies({
    amenities: property.amenities,
    wellness_consumption_indoor_allowed: property.cannabisIndoor,
    wellness_consumption_outdoor_allowed: property.cannabisOutdoor,
    smoking_inside_allowed: property.tobaccoIndoor,
    smoking_outside_allowed: property.tobaccoOutdoor,
    smoke_friendly: property.tobaccoAllowed,
  });
  const place = parsePropertyPlace(property.location);
  const locationLinks: { href: string; label: string }[] = [];
  if (place.isMiami) {
    locationLinks.push({ href: '/miami', label: 'Miami vacation rentals' });
  }
  if (place.neighborhood) {
    locationLinks.push({
      href: `/miami/${place.neighborhood}`,
      label: `Stays in ${place.neighborhoodName}`,
    });
  }
  if (place.isMiami && property.cannabisAllowed) {
    locationLinks.push({
      href: '/miami/420-friendly',
      label: 'Cannabis-friendly Miami stays',
    });
    if (place.neighborhood) {
      locationLinks.push({
        href: `/miami/420-friendly/${place.neighborhood}`,
        label: `Cannabis-friendly stays in ${place.neighborhoodName}`,
      });
    }
  }

  const facts = [
    ['Location', place.publicLocation || property.location || 'Listed on VibesBNB'],
    ['Neighborhood', place.neighborhoodName],
    ['Type', property.type],
    ['Guests', property.guests != null ? String(property.guests) : null],
    ['Bedrooms', property.bedrooms != null ? String(property.bedrooms) : null],
    ['Beds', property.beds != null ? String(property.beds) : null],
    ['Bathrooms', property.bathrooms != null ? String(property.bathrooms) : null],
    ['Cannabis policy', cannabisPolicyLabel(policies)],
    ['Tobacco smoking', tobaccoPolicyLabel(policies)],
    ['Outdoor space', outdoorSpaceLabel(policies)],
    [
      'Reviews',
      property.reviewsCount > 0 && property.rating
        ? `${property.rating} average from ${property.reviewsCount} reviews`
        : 'No public rating yet',
    ],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <section className="bg-gray-950 text-white border-b border-white/10">
      <div className="container mx-auto px-4 pt-6 pb-2 max-w-6xl">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-400 mb-4 flex flex-wrap gap-2">
          <Link href="/" className="hover:text-primary-400">
            VibesBNB
          </Link>
          {place.isMiami ? (
            <>
              <span aria-hidden>/</span>
              <Link href="/miami" className="hover:text-primary-400">
                Miami
              </Link>
            </>
          ) : null}
          {place.neighborhood ? (
            <>
              <span aria-hidden>/</span>
              <Link href={`/miami/${place.neighborhood}`} className="hover:text-primary-400">
                {place.neighborhoodName}
              </Link>
            </>
          ) : null}
          <span aria-hidden>/</span>
          <span className="text-white">{property.name}</span>
        </nav>
        <h2 className="sr-only">Listing facts</h2>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm mb-4">
          {facts.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <dt className="text-gray-500 text-xs uppercase tracking-wide">{label}</dt>
              <dd className="text-white mt-1">{value}</dd>
            </div>
          ))}
        </dl>
        {property.description ? (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Description</h3>
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
              {property.description}
            </p>
          </div>
        ) : null}
        {property.amenities.length > 0 ? (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Amenities</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{property.amenities.join(', ')}</p>
          </div>
        ) : null}
        {locationLinks.length > 0 ? (
          <p className="text-sm text-gray-400 pb-4">
            More stays:{' '}
            {locationLinks.map((link, i) => (
              <span key={link.href}>
                {i > 0 ? ' · ' : null}
                <Link href={link.href} className="text-emerald-400 hover:text-emerald-300">
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </section>
  );
}
