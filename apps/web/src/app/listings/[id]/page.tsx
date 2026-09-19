import type { Metadata } from 'next';
import ListingPageClient from './ListingPageClient';
import { JsonLd } from '@/components/seo/JsonLd';
import { PropertySeoFacts } from '@/components/seo/PropertySeoFacts';
import { vacationRentalJsonLd } from '@/lib/seo/jsonLd';
import { fetchSeoPropertyById } from '@/lib/seo/publicProperties';
import { absoluteUrl } from '@/lib/seo/siteUrl';

type Props = { params: { id: string } };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await fetchSeoPropertyById(params.id);
  const url = absoluteUrl(`/listings/${params.id}`);
  if (!property) {
    return {
      title: 'Property on VibesBNB',
      robots: { index: false, follow: true },
      alternates: { canonical: url },
    };
  }
  const place = property.publicLocation;
  const cannabisBit = property.cannabisAllowed
    ? property.fullyCannabisFriendly
      ? 'Cannabis consumption allowed indoors and outdoors. '
      : property.cannabisIndoor
        ? 'Cannabis consumption allowed indoors. '
        : 'Cannabis consumption allowed outdoors. '
    : '';
  const description = (
    property.description ||
    `${property.name} is a ${property.type || 'vacation rental'}${place ? ` in ${place}` : ''} on VibesBNB. ${cannabisBit}`.trim()
  ).slice(0, 180);
  const ogImage = property.coverImage || '/opengraph-image';

  return {
    title: property.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: property.name,
      description,
      siteName: 'VibesBNB',
      images: [{ url: ogImage, width: 1200, height: 630, alt: property.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: property.name,
      description,
      images: [ogImage],
    },
  };
}

export default async function ListingPage({ params }: Props) {
  const property = await fetchSeoPropertyById(params.id);

  return (
    <>
      {property ? <JsonLd data={vacationRentalJsonLd(property)} /> : null}
      <ListingPageClient />
      {property ? <PropertySeoFacts property={property} /> : null}
    </>
  );
}
