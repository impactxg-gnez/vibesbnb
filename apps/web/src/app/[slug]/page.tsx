import { notFound, permanentRedirect } from 'next/navigation';
import { isReservedPropertySlug, normalizePropertySlug } from '@/lib/propertySlug';
import { createPublicSupabase } from '@/lib/seo/publicSupabase';

export const dynamic = 'force-dynamic';

export default async function CustomPropertySlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = normalizePropertySlug(params.slug);
  if (!slug || isReservedPropertySlug(slug)) {
    notFound();
  }

  const supabase = createPublicSupabase();
  if (!supabase) {
    notFound();
  }

  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('custom_slug', slug)
    .maybeSingle();

  if (error || !data?.id) {
    notFound();
  }

  permanentRedirect(`/listings/${encodeURIComponent(data.id)}`);
}
