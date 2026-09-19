import { redirect } from 'next/navigation';
import { LocationLanding } from '@/components/seo/LocationLanding';
import { fetchActiveSeoProperties } from '@/lib/seo/publicProperties';
import { buildCannabisNeighborhoodPage, locationMetadata } from '@/lib/seo/locationPages';
import { MIAMI_NEIGHBORHOODS } from '@/lib/seo/propertyPlace';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type Props = { params: { neighborhood: string } };

export function generateStaticParams() {
  return MIAMI_NEIGHBORHOODS.map((n) => ({ neighborhood: n.slug }));
}

export async function generateMetadata({ params }: Props) {
  const properties = await fetchActiveSeoProperties();
  const model = buildCannabisNeighborhoodPage(properties, params.neighborhood);
  if (!model) {
    return { title: '420-friendly neighborhood stays', robots: { index: false, follow: true } };
  }
  return locationMetadata(model);
}

export default async function MiamiCannabisNeighborhoodPage({ params }: Props) {
  const properties = await fetchActiveSeoProperties();
  const model = buildCannabisNeighborhoodPage(properties, params.neighborhood);
  if (!model) redirect('/miami/420-friendly');
  return <LocationLanding model={model} />;
}
