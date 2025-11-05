'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export function Hero() {
  return (
    <div className="relative h-64 overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&h=400&fit=crop"
        alt="Cannabis-friendly sanctuary"
        fill
        className="object-cover opacity-70"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
      
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <h1 className="text-3xl font-bold text-white mb-3">
            Find your cannabis-friendly sanctuary
          </h1>
          <p className="text-gray-300">
            Discover serene stays with spas, yoga decks, and curated wellness amenities.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
