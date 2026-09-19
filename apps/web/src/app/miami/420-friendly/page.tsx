import { notFound, redirect } from 'next/navigation';
import { LocationLanding } from '@/components/seo/LocationLanding';
import { fetchActiveSeoProperties } from '@/lib/seo/publicProperties';
import { buildCannabisMiamiPage, buildMiamiPage, locationMetadata } from '@/lib/seo/locationPages';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const properties = await fetchActiveSeoProperties();
  const model = buildCannabisMiamiPage(properties);
  if (!model) {
    return { title: '420-friendly Miami stays', robots: { index: false, follow: true } };
  }
  return locationMetadata(model);
}

export default async function MiamiCannabisPage() {
  const properties = await fetchActiveSeoProperties();
  const model = buildCannabisMiamiPage(properties);
  if (!model) {
    if (buildMiamiPage(properties)) redirect('/miami');
    notFound();
  }
  return <LocationLanding model={model} />;
}
