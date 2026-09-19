import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'VibesBNB is a Miami vacation rental marketplace for short-term stays with published cannabis and wellness policies on each listing.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About VibesBNB',
    description:
      'A vacation rental marketplace for short-term stays in Miami, with listing-level cannabis and wellness house rules.',
    url: '/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
