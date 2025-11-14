'use client';

import { motion } from 'framer-motion';

export function Hero() {
  // Get image URL from environment variable
  // Set NEXT_PUBLIC_HERO_BACKGROUND_URL in your .env.local after uploading via /admin/upload-hero-image
  // Or construct the Supabase URL: https://YOUR_PROJECT.supabase.co/storage/v1/object/public/hero-images/hero/FILENAME
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const backgroundImageUrl = process.env.NEXT_PUBLIC_HERO_BACKGROUND_URL || 
    (supabaseUrl ? `${supabaseUrl.replace('/rest/v1', '')}/storage/v1/object/public/hero-images/hero/peace-sign-background.jpg` : '');
  
  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden">
      <img
        src={backgroundImageUrl}
        alt="VibesBNB - Peace, Love, Good Vibes"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          // Fallback if image fails to load
          console.error('Background image failed to load:', backgroundImageUrl);
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-gray-950/20 to-transparent" />
      
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Find your wellness-friendly sanctuary
          </h1>
          <p className="text-lg md:text-xl text-white drop-shadow-md">
            Discover serene stays with spas, yoga decks, and curated wellness amenities.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
