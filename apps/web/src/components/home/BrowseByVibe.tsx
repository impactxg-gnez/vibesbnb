'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const vibes = [
  {
    id: 'cabins',
    name: 'Cabins',
    image: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&h=600&fit=crop&q=80',
    fallback: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop&q=80',
  },
  {
    id: 'desert',
    name: 'Desert',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80',
    fallback: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop&q=80',
  },
  {
    id: 'lakeside',
    name: 'Lakeside',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=600&fit=crop&q=80',
    fallback: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=600&fit=crop&q=80',
  },
  {
    id: 'spa',
    name: 'Spa Resorts',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop&q=80',
    fallback: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&h=600&fit=crop&q=80',
  },
];

export function BrowseByVibe() {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageSources, setImageSources] = useState<Record<string, string>>({});

  const handleImageError = (vibeId: string, fallback?: string) => {
    if (!imageErrors.has(vibeId) && fallback) {
      setImageErrors(prev => new Set(prev).add(vibeId));
      setImageSources(prev => ({ ...prev, [vibeId]: fallback }));
    }
  };

  return (
    <div className="container mx-auto px-4 pb-12">
      <h2 className="text-2xl font-bold text-mist-100 mb-6">Browse by vibe</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {vibes.map((vibe, index) => {
          const currentImage = imageSources[vibe.id] || vibe.image;
          const hasError = imageErrors.has(vibe.id);
          
          return (
            <motion.div
              key={vibe.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link
                href={`/search?vibe=${vibe.id}`}
                className="group block relative h-40 rounded-3xl overflow-hidden bg-charcoal-800"
              >
                {hasError && !vibe.fallback ? (
                  <div className="w-full h-full flex items-center justify-center bg-charcoal-800">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-mist-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-mist-500 text-xs">Image unavailable</p>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={currentImage}
                    alt={vibe.name}
                    fill
                    className="object-cover group-hover:scale-110 transition duration-500"
                    onError={() => handleImageError(vibe.id, vibe.fallback)}
                    unoptimized={true}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-mist-100 font-semibold text-lg drop-shadow-lg">{vibe.name}</h3>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

