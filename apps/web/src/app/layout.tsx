import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { LayoutContent } from './LayoutContent';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'VibesBNB - Wellness-Friendly Vacation Rentals',
  description: 'Find your perfect wellness retreat with wellness-friendly, yoga-inspired, and mindful travel experiences.',
  icons: {
    icon: '/logo.png',
  },
};

function imageOriginHints() {
  const hints: ReactNode[] = [];
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabase && /^https:\/\//i.test(supabase)) {
    try {
      const origin = new URL(supabase).origin;
      hints.push(
        <link key="preconnect-supabase" rel="preconnect" href={origin} crossOrigin="anonymous" />
      );
      hints.push(<link key="dns-supabase" rel="dns-prefetch" href={origin} />);
    } catch {
      /* ignore */
    }
  }
  hints.push(
    <link
      key="preconnect-unsplash"
      rel="preconnect"
      href="https://images.unsplash.com"
      crossOrigin="anonymous"
    />
  );
  return hints;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {imageOriginHints()}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBMockKeyForDevelopment'}&libraries=places`}
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}
