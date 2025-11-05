'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const retreats = [
  {
    id: 1,
    name: 'Cedar Grove Cabin',
    location: 'Asheville, NC',
    rating: 4.8,
    reviews: 126,
    price: 185,
    image: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop',
    amenities: ['Yoga deck', 'Hot tub'],
    badge: 'Cannabis-friendly',
  },
  {
    id: 2,
    name: 'Lakeside Lodge',
    location: 'Truckee, CA',
    rating: 4.9,
    reviews: 89,
    price: 245,
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop',
    amenities: ['Sauna', 'Lake view'],
    badge: 'Cannabis-friendly',
  },
];

export function FeaturedRetreats() {
  return (
    <div className="container mx-auto px-4 pb-12">
      <h2 className="text-2xl font-bold text-white mb-6">Featured retreats</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {retreats.map((retreat, index) => (
          <motion.div
            key={retreat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Link href={`/listings/${retreat.id}`} className="group block">
              <div className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 hover:border-emerald-500 transition">
                <div className="relative h-48">
                  <Image
                    src={retreat.image}
                    alt={retreat.name}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-gray-900/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-gray-700">
                      {retreat.badge}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-1">
                        {retreat.name}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>{retreat.location}</span>
                        <span className="mx-1">•</span>
                        <span>{retreat.rating} ({retreat.reviews})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">${retreat.price}/night</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    {retreat.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

