import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://vibesbnb.com';
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/search`, lastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/signup`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
