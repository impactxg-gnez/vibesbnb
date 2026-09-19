import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/bookings',
          '/bookings/',
          '/messages',
          '/messages/',
          '/profile',
          '/profile/',
          '/host/dashboard',
          '/host/properties',
          '/host/bookings',
          '/host/messages',
          '/host/payouts',
          '/host/application-submitted',
          '/review/',
          '/reset-password',
          '/verify-email',
          '/verify-phone',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
