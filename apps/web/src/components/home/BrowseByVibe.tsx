'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const vibes = [
  {
    id: 'cabins',
    name: 'Cabins',
    image: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=400&h=300&fit=crop',
  },
  {
    id: 'desert',
    name: 'Desert',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=300&fit=crop',
  },
  {
    id: 'lakeside',
    name: 'Lakeside',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop',
  },
  {
    id: 'spa',
    name: 'Spa Resorts',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop',
  },
];

export function BrowseByVibe() {
  return (
    <div className="container mx-auto px-4 pb-12">
      <h2 className="text-2xl font-bold text-white mb-6">Browse by vibe</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {vibes.map((vibe, index) => (
          <motion.div
            key={vibe.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link
              href={`/search?vibe=${vibe.id}`}
              className="group block relative h-40 rounded-3xl overflow-hidden"
            >
              <Image
                src={vibe.image}
                alt={vibe.name}
                fill
                className="object-cover group-hover:scale-110 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h3 className="text-white font-semibold text-lg">{vibe.name}</h3>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

