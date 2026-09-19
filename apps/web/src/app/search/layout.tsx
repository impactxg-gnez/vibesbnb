import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo/siteUrl';

export const metadata: Metadata = {
  title: 'Search vacation rentals',
  description:
    'Browse VibesBNB vacation rentals by dates, location, amenities, and host-verified cannabis policy. Use Miami or neighborhood search to find short-term stays.',
  alternates: { canonical: absoluteUrl('/search') },
  openGraph: {
    title: 'Search vacation rentals | VibesBNB',
    description:
      'Find short-term stays on VibesBNB, including Miami listings with published cannabis and outdoor-space rules.',
    url: absoluteUrl('/search'),
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
