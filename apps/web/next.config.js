/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-globe.gl', 'globe.gl', 'three-globe'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    domains: [
      'source.unsplash.com',
      'images.unsplash.com',
      'picsum.photos',
      'i.pravatar.cc',
      'cdn.vibesbnb.com',
      'vibesbnb-media.s3.amazonaws.com',
      'esca-management.com',
      'www.esca-management.com',
      'a0.muscache.com',
      'a1.muscache.com',
      'a2.muscache.com',
      'okmudgacbpgycixtpoqx.supabase.co',
      '*.supabase.co',
    ],
    unoptimized: false,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  },
  webpack: (config, { isServer }) => {
    return config;
  },
};


