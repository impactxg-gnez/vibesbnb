/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Prefer remotePatterns (supports wildcards); keeps Next/Image working for Supabase Storage, etc.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: 'source.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'i.pravatar.cc', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.vibesbnb.com', pathname: '/**' },
      { protocol: 'https', hostname: 'vibesbnb-media.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'esca-management.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.esca-management.com', pathname: '/**' },
      { protocol: 'https', hostname: 'ammosfl.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.ammosfl.com', pathname: '/**' },
      { protocol: 'https', hostname: 'a0.muscache.com', pathname: '/**' },
      { protocol: 'https', hostname: 'a1.muscache.com', pathname: '/**' },
      { protocol: 'https', hostname: 'a2.muscache.com', pathname: '/**' },
      { protocol: 'https', hostname: 'via.placeholder.com', pathname: '/**' },
      { protocol: 'https', hostname: 'api.dicebear.com', pathname: '/**' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    // Explicitly pass through so `next build` on Vercel always embeds them in the client bundle
    // (same pattern as API URL / Maps; helps monorepo + Root Directory setups).
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  webpack: (config, { isServer }) => {
    // Externalize packages for server-side to avoid webpack bundling issues
    if (isServer) {
      config.externals = [
        ...(config.externals || []), 
        'cheerio',
        '@sparticuz/chromium',
        'puppeteer-core',
        'puppeteer',
      ];
    }
    
    return config;
  },
};

module.exports = nextConfig;


