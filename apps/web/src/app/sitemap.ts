import type { MetadataRoute } from 'next';
import { fetchActiveSeoProperties } from '@/lib/seo/publicProperties';
import { indexableLocationPaths } from '@/lib/seo/locationPages';
import { getSiteUrl } from '@/lib/seo/siteUrl';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();
  const properties = await fetchActiveSeoProperties();
  const locationPaths = indexableLocationPaths(properties);

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/search`, lastModified, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/faq`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/host`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/accessibility`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const locations: MetadataRoute.Sitemap = locationPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: 'daily' as const,
    priority: path === '/miami' ? 0.9 : 0.8,
  }));

  const listings: MetadataRoute.Sitemap = properties.map((property) => ({
    url: `${baseUrl}/listings/${property.id}`,
    lastModified: property.updatedAt ? new Date(property.updatedAt) : lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...locations, ...listings];
}
