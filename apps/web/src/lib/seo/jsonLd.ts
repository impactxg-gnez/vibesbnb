import { altForImageUrl } from '@/lib/accessibility';
import { effectiveCheckInTime, effectiveCheckOutTime } from '@/lib/checkInOutPolicy';
import { resolveGuestCapacity } from '@/lib/guestCapacity';
import { amenityFeaturesFromListing } from '@/lib/seo/amenityFeatures';
import { parsePropertyPlace } from '@/lib/seo/propertyPlace';
import { resolvePropertyStayPolicies } from '@/lib/seo/propertyStayPolicies';
import { getSiteUrl, absoluteUrl } from '@/lib/seo/siteUrl';
import type { SeoPropertyCard } from '@/lib/seo/publicProperties';

const PLACEHOLDER_HOST = 'photo-1542718610';

function additionalTypeFromListingType(type: string | null): string | undefined {
  const t = (type || '').toLowerCase();
  if (/\bapartment|flat|loft|studio\b/.test(t)) {
    return 'https://schema.org/Apartment';
  }
  if (/\bcondo|condominium\b/.test(t)) {
    return 'https://schema.org/Apartment';
  }
  if (/\bhouse|villa|bungalow|townhouse|cabin\b/.test(t)) {
    return 'https://schema.org/House';
  }
  if (/\broom\b/.test(t)) {
    return 'https://schema.org/Room';
  }
  return 'https://schema.org/Accommodation';
}

function absoluteImages(property: SeoPropertyCard, siteUrl: string): string[] {
  const raw = [
    property.coverImage,
    ...property.images,
    `/api/properties/${encodeURIComponent(property.id)}/cover`,
  ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (item.startsWith('data:') || item.includes(PLACEHOLDER_HOST)) continue;
    const abs = item.startsWith('http') ? item : `${siteUrl}${item.startsWith('/') ? item : `/${item}`}`;
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
    if (out.length >= 12) break;
  }
  return out;
}

function clockToIsoTime(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${h}:${m}:00`;
}

/**
 * Google VacationRental JSON-LD from stored listing fields only.
 * Omits street address (public listings intentionally hide it).
 * Does not invent ratings, reviews, or cannabis claims.
 */
export function vacationRentalJsonLd(property: SeoPropertyCard) {
  const url = absoluteUrl(`/listings/${property.id}`);
  const place = parsePropertyPlace(property.location);
  const policies = resolvePropertyStayPolicies({
    amenities: property.amenities,
    wellness_consumption_indoor_allowed: property.cannabisIndoor,
    wellness_consumption_outdoor_allowed: property.cannabisOutdoor,
    smoking_inside_allowed: property.tobaccoIndoor,
    smoking_outside_allowed: property.tobaccoOutdoor,
    smoke_friendly: property.tobaccoAllowed,
  });
  const occupancy = resolveGuestCapacity({
    guests: property.guests,
    allow_extra_guests: property.allowExtraGuests,
    max_extra_guests: property.maxExtraGuests,
  });
  const images = absoluteImages(property, getSiteUrl());
  const checkIn = clockToIsoTime(effectiveCheckInTime({ checkInTime: property.checkInTime }));
  const checkOut = clockToIsoTime(effectiveCheckOutTime({ checkOutTime: property.checkOutTime }));

  const address: Record<string, unknown> = {
    '@type': 'PostalAddress',
    addressCountry: place.country || 'US',
  };
  if (place.locality) address.addressLocality = place.locality;
  if (place.region) address.addressRegion = place.region;
  if (place.postalCode) address.postalCode = place.postalCode;
  if (place.neighborhoodName) address.addressNeighborhood = place.neighborhoodName;

  const containsPlace: Record<string, unknown> = {
    '@type': 'Accommodation',
    additionalType: additionalTypeFromListingType(property.type),
    identifier: `${property.id}-accommodation`,
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: occupancy,
    },
    smokingAllowed: policies.tobaccoAllowed,
    amenityFeature: amenityFeaturesFromListing({
      amenities: property.amenities,
      policies,
    }),
  };

  if (property.bedrooms != null && property.bedrooms >= 0) {
    containsPlace.numberOfBedrooms = property.bedrooms;
  }
  if (property.bathrooms != null && property.bathrooms >= 0) {
    containsPlace.numberOfBathroomsTotal = property.bathrooms;
  }
  if (property.beds != null && property.beds >= 1) {
    containsPlace.bed = [
      {
        '@type': 'BedDetails',
        numberOfBeds: property.beds,
        typeOfBed: 'Bed',
      },
    ];
  }

  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    '@id': `${url}#vacation-rental`,
    identifier: property.id,
    name: property.name,
    url,
    additionalType: additionalTypeFromListingType(property.type),
    brand: {
      '@type': 'Brand',
      name: 'VibesBNB',
    },
    address,
    containsPlace,
    checkinTime: checkIn,
    checkoutTime: checkOut,
  };

  if (property.description) node.description = property.description.slice(0, 5000);
  if (images.length > 0) {
    node.image = images.map((urlValue, i) => ({
      '@type': 'ImageObject',
      url: urlValue,
      description: altForImageUrl(
        property.images[i] || property.coverImage,
        property.imageAlts,
        `${property.name} photo ${i + 1}`
      ),
    }));
  }

  if (
    property.latitude != null &&
    property.longitude != null &&
    Math.abs(property.latitude) <= 90 &&
    Math.abs(property.longitude) <= 180
  ) {
    node.geo = {
      '@type': 'GeoCoordinates',
      latitude: property.latitude,
      longitude: property.longitude,
    };
    node.latitude = property.latitude;
    node.longitude = property.longitude;
  }

  if (property.reviewsCount > 0 && property.rating != null && property.rating > 0) {
    node.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: property.rating,
      reviewCount: property.reviewsCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return node;
}

export function faqPageJsonLd(items: { q: string; a: string }[]) {
  const valid = items.filter((item) => item.q.trim() && item.a.trim());
  if (valid.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: valid.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function organizationJsonLd() {
  const url = absoluteUrl('/');
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: 'VibesBNB',
    url,
    logo: absoluteUrl('/logo.png'),
    email: 'info@vibesbnb.com',
    parentOrganization: {
      '@type': 'Organization',
      name: 'AllBlack Everything LLC',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Miami',
        addressRegion: 'FL',
        addressCountry: 'US',
      },
    },
    areaServed: {
      '@type': 'City',
      name: 'Miami',
      containedInPlace: {
        '@type': 'State',
        name: 'Florida',
      },
    },
  };
}

export function webSiteJsonLd() {
  const url = absoluteUrl('/');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}#website`,
    name: 'VibesBNB',
    url,
    publisher: { '@id': `${url}#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/search?location={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
