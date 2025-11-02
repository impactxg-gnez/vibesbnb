'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Listing {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  images: string[];
  type: string;
}

export function FeaturedListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder - will be replaced with actual API call
    const mockListings: Listing[] = [
      {
        id: '1',
        title: 'Mountain View Cabin',
        location: 'Colorado, USA',
        price: 150,
        rating: 4.9,
        images: ['https://via.placeholder.com/400x300'],
        type: 'Cabin',
      },
      {
        id: '2',
        title: 'Beachfront Bungalow',
        location: 'California, USA',
        price: 200,
        rating: 4.8,
        images: ['https://via.placeholder.com/400x300'],
        type: 'Bungalow',
      },
      {
        id: '3',
        title: 'Urban Loft',
        location: 'Portland, OR',
        price: 120,
        rating: 4.7,
        images: ['https://via.placeholder.com/400x300'],
        type: 'Apartment',
      },
      {
        id: '4',
        title: 'Desert Oasis',
        location: 'Arizona, USA',
        price: 180,
        rating: 4.9,
        images: ['https://via.placeholder.com/400x300'],
        type: 'Villa',
      },
    ];
    
    setListings(mockListings);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Listings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="animate-pulse">
              <div className="bg-gray-300 h-64 rounded-xl mb-3"></div>
              <div className="bg-gray-300 h-4 rounded w-3/4 mb-2"></div>
              <div className="bg-gray-300 h-4 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Listings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className="group cursor-pointer"
          >
            <div className="relative h-64 mb-3 rounded-xl overflow-hidden">
              <Image
                src={listing.images[0]}
                alt={listing.title}
                fill
                className="object-cover group-hover:scale-110 transition duration-300"
              />
            </div>
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-green-600">
                {listing.title}
              </h3>
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                <span className="text-sm font-medium">{listing.rating}</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-1">{listing.location}</p>
            <p className="text-gray-900 font-semibold">
              ${listing.price} <span className="font-normal text-gray-600">/ night</span>
            </p>
          </Link>
        ))}
      </div>
      <div className="text-center mt-12">
        <Link
          href="/search"
          className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          View All Listings
        </Link>
      </div>
    </div>
  );
}

