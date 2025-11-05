'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/search/SearchBar';
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
  amenities: string[];
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - will be replaced with actual API call
    const mockListings: Listing[] = [
      {
        id: '1',
        title: 'Mountain View Cabin',
        location: 'Colorado, USA',
        price: 150,
        rating: 4.9,
        images: ['https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400&h=300&fit=crop'],
        type: 'Cabin',
        amenities: ['420-Friendly', 'Hot Tub', 'Mountain View'],
      },
      {
        id: '2',
        title: 'Beachfront Bungalow',
        location: 'California, USA',
        price: 200,
        rating: 4.8,
        images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&h=300&fit=crop'],
        type: 'Bungalow',
        amenities: ['420-Friendly', 'Beach Access', 'Private Deck'],
      },
      {
        id: '3',
        title: 'Urban Loft',
        location: 'Portland, OR',
        price: 120,
        rating: 4.7,
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop'],
        type: 'Apartment',
        amenities: ['420-Friendly', 'Downtown', 'Modern'],
      },
      {
        id: '4',
        title: 'Desert Oasis',
        location: 'Arizona, USA',
        price: 180,
        rating: 4.9,
        images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop'],
        type: 'Villa',
        amenities: ['420-Friendly', 'Pool', 'Stargazing'],
      },
      {
        id: '5',
        title: 'Forest Retreat',
        location: 'Washington, USA',
        price: 165,
        rating: 4.8,
        images: ['https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=400&h=300&fit=crop'],
        type: 'Cabin',
        amenities: ['420-Friendly', 'Fireplace', 'Hiking Trails'],
      },
      {
        id: '6',
        title: 'Lake House',
        location: 'Michigan, USA',
        price: 190,
        rating: 4.9,
        images: ['https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=400&h=300&fit=crop'],
        type: 'House',
        amenities: ['420-Friendly', 'Lake View', 'Boat Dock'],
      },
    ];

    setListings(mockListings);
    setLoading(false);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-emerald-600 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-white mb-6">Find Your Perfect Stay</h1>
          <SearchBar />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-300">
            {loading ? 'Searching...' : `${listings.length} properties found`}
          </p>
          <select className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Rating: High to Low</option>
            <option>Most Recent</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="animate-pulse">
                <div className="bg-gray-800 h-64 rounded-xl mb-3"></div>
                <div className="bg-gray-800 h-4 rounded w-3/4 mb-2"></div>
                <div className="bg-gray-800 h-4 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800 hover:shadow-xl hover:border-emerald-500/50 transition"
              >
                <div className="relative h-64">
                  <Image
                    src={listing.images[0]}
                    alt={listing.title}
                    fill
                    className="object-cover group-hover:scale-110 transition duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    420-Friendly
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white text-lg group-hover:text-emerald-500">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-medium text-gray-100">{listing.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{listing.location}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {listing.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                  <p className="text-white font-bold text-lg">
                    ${listing.price} <span className="font-normal text-gray-400 text-sm">/ night</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
