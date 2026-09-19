import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { HomeEntitySection } from '@/components/seo/HomeEntitySection';
import { JsonLd } from '@/components/seo/JsonLd';
import { organizationJsonLd, webSiteJsonLd } from '@/lib/seo/jsonLd';
import { fetchActiveSeoProperties } from '@/lib/seo/publicProperties';
import { absoluteUrl } from '@/lib/seo/siteUrl';

const title = 'VibesBNB — Miami vacation rentals';
const description =
  'VibesBNB is a vacation rental marketplace for short-term stays in Miami. Browse apartments, condos, and homes with published house rules, including cannabis-friendly listings where a host has verified indoor or outdoor consumption.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/'),
    title,
    description,
    siteName: 'VibesBNB',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'VibesBNB Miami vacation rentals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image'],
  },
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const properties = await fetchActiveSeoProperties();
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webSiteJsonLd()} />
      <HomePageClient />
      <HomeEntitySection properties={properties} />
    </>
  );
}
