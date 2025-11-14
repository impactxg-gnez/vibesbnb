'use client';

import { motion } from 'framer-motion';

export function Hero() {
  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden">
      <img
        src="/peace-sign-background.jpg"
        alt="VibesBNB - Peace, Love, Good Vibes"
        className="absolute inset-0 w-full h-full object-cover"
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
