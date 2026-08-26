import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { LayoutContent } from './LayoutContent';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });
const GA_MEASUREMENT_ID = 'G-S7RJJXXRD9';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://vibesbnb.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'VibesBNB - Wellness-Friendly Vacation Rentals',
    template: '%s | VibesBNB',
  },
  description:
    'Find your perfect wellness retreat with wellness-friendly, yoga-inspired, and mindful travel experiences.',
  applicationName: 'VibesBNB',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'VibesBNB',
    title: 'VibesBNB - Wellness-Friendly Vacation Rentals',
    description:
      'Find your perfect wellness retreat with wellness-friendly, yoga-inspired, and mindful travel experiences.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'VibesBNB — Wellness-friendly vacation rentals',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibesBNB - Wellness-Friendly Vacation Rentals',
    description:
      'Find your perfect wellness retreat with wellness-friendly, yoga-inspired, and mindful travel experiences.',
    images: ['/opengraph-image'],
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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
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
