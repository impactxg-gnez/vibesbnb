import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { normalizePropertyImages } from '@/lib/propertyImageUrls';

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://vibesbnb.com';

type Props = {
  children: ReactNode;
  params: { id: string };
};

function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params.id;
  const fallbackTitle = 'Property on VibesBNB';
  const fallbackDescription =
    'Browse this wellness-friendly stay on VibesBNB.';

  try {
    const supabase = supabasePublic();
    if (!supabase) {
      return {
        title: fallbackTitle,
        description: fallbackDescription,
        openGraph: {
          title: fallbackTitle,
          description: fallbackDescription,
          url: `${siteUrl}/listings/${id}`,
          images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
        },
      };
    }

    const { data } = await supabase
      .from('properties')
      .select('name, title, description, location, images, status')
      .eq('id', id)
      .maybeSingle();

    const name =
      (data?.name as string) ||
      (data?.title as string) ||
      fallbackTitle;
    const description =
      (typeof data?.description === 'string' && data.description.trim()
        ? data.description.trim().slice(0, 180)
        : null) ||
      (data?.location
        ? `Wellness-friendly stay in ${String(data.location).split(',').slice(-2).join(', ').trim()}`
        : fallbackDescription);

    const images = normalizePropertyImages(
      Array.isArray(data?.images) ? (data!.images as string[]) : [],
      `${siteUrl}/opengraph-image`
    );
    const primary = images[0];
    const ogImage =
      primary && /^https?:\/\//i.test(primary) && !primary.startsWith('data:')
        ? primary
        : `${siteUrl}/opengraph-image`;

    return {
      title: name,
      description,
      openGraph: {
        type: 'website',
        title: name,
        description,
        url: `${siteUrl}/listings/${id}`,
        siteName: 'VibesBNB',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: name,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: name,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
    };
  }
}

export default function ListingLayout({ children }: Props) {
  return children;
}
