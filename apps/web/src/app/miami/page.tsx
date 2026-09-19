import { notFound } from 'next/navigation';
import { LocationLanding } from '@/components/seo/LocationLanding';
import { fetchActiveSeoProperties } from '@/lib/seo/publicProperties';
import { buildMiamiPage, locationMetadata } from '@/lib/seo/locationPages';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const properties = await fetchActiveSeoProperties();
  const model = buildMiamiPage(properties);
  if (!model) {
    return { title: 'Miami vacation rentals', robots: { index: false, follow: true } };
  }
  return locationMetadata(model);
}

export default async function MiamiPage() {
  const properties = await fetchActiveSeoProperties();
  const model = buildMiamiPage(properties);
  if (!model) notFound();
  return <LocationLanding model={model} />;
}
