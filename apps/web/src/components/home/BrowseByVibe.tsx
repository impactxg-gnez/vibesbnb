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
    <div className="container mx-auto px-6 pb-24">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl font-bold text-white tracking-tight">
          Browse by <span className="text-primary-500 italic">Vibe</span>
        </h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {vibes.map((vibe, index) => (
          <motion.div
            key={vibe.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Link
              href={`/search?vibe=${vibe.id}`}
              className="group block relative h-48 rounded-[2rem] overflow-hidden border border-white/5 hover:border-primary-500/30 transition-all duration-500"
            >
              <Image
                src={vibe.image}
                alt={vibe.name}
                fill
                className="object-cover group-hover:scale-125 transition duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent group-hover:from-primary-950/90 transition-colors duration-500" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-white font-bold text-xl mb-1 group-hover:text-primary-500 transition-colors">{vibe.name}</h3>
                <div className="w-8 h-1 bg-primary-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

