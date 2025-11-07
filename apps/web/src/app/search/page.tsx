'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/search/SearchBar';
import Link from 'next/link';
import Image from 'next/image';

interface Listing {
  id: string;
  title?: string;
  name?: string;
  location: string;
  price: number;
  rating?: number;
  images: string[];
  type?: string;
  amenities?: string[];
  guests?: number;
  status?: string;
  [key: string]: any;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAndFilterProperties = () => {
      setLoading(true);
      
      // Get search parameters
      const location = searchParams.get('location') || '';
      const guests = parseInt(searchParams.get('guests') || '0');
      const checkIn = searchParams.get('checkIn') || '';
      const checkOut = searchParams.get('checkOut') || '';

      // Get all properties from localStorage (from all users)
      const allProperties: Listing[] = [];
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith('properties_')) {
          try {
            const properties = JSON.parse(localStorage.getItem(key) || '[]') as Listing[];
            // Only include active properties
            const activeProperties = properties.filter(p => p.status === 'active');
            allProperties.push(...activeProperties);
          } catch (e) {
            console.error('Error parsing properties:', e);
          }
        }
      });

      // If no properties found, use mock data
      let filteredListings: Listing[] = allProperties.length > 0 ? allProperties : [
        {
          id: '1',
          name: 'Mountain View Cabin',
          location: 'Colorado, USA',
          price: 150,
          rating: 4.9,
          images: ['https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400&h=300&fit=crop'],
          type: 'Cabin',
          amenities: ['Wellness-Friendly', 'Hot Tub', 'Mountain View'],
          guests: 6,
          status: 'active',
        },
        {
          id: '2',
          name: 'Beachfront Bungalow',
          location: 'California, USA',
          price: 200,
          rating: 4.8,
          images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&h=300&fit=crop'],
          type: 'Bungalow',
          amenities: ['Wellness-Friendly', 'Beach Access', 'Private Deck'],
          guests: 4,
          status: 'active',
        },
        {
          id: '3',
          name: 'Urban Loft',
          location: 'Portland, OR',
          price: 120,
          rating: 4.7,
          images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop'],
          type: 'Apartment',
          amenities: ['Wellness-Friendly', 'Downtown', 'Modern'],
          guests: 2,
          status: 'active',
        },
        {
          id: '4',
          name: 'Desert Oasis',
          location: 'Arizona, USA',
          price: 180,
          rating: 4.9,
          images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop'],
          type: 'Villa',
          amenities: ['Wellness-Friendly', 'Pool', 'Stargazing'],
          guests: 8,
          status: 'active',
        },
        {
          id: '5',
          name: 'Forest Retreat',
          location: 'Washington, USA',
          price: 165,
          rating: 4.8,
          images: ['https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=400&h=300&fit=crop'],
          type: 'Cabin',
          amenities: ['Wellness-Friendly', 'Fireplace', 'Hiking Trails'],
          guests: 4,
          status: 'active',
        },
        {
          id: '6',
          name: 'Lake House',
          location: 'Michigan, USA',
          price: 190,
          rating: 4.9,
          images: ['https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=400&h=300&fit=crop'],
          type: 'House',
          amenities: ['Wellness-Friendly', 'Lake View', 'Boat Dock'],
          guests: 10,
          status: 'active',
        },
      ];

      // Filter by location
      if (location) {
        filteredListings = filteredListings.filter(listing =>
          listing.location.toLowerCase().includes(location.toLowerCase())
        );
      }

      // Filter by guest count - show properties that allow selected guests or more
      if (guests > 0) {
        filteredListings = filteredListings.filter(listing => {
          const propertyGuests = listing.guests || 0;
          return propertyGuests >= guests;
        });
      }

      // Convert to Listing format (normalize name/title)
      const normalizedListings: Listing[] = filteredListings.map(listing => ({
        ...listing,
        title: listing.title || listing.name || 'Property',
        rating: listing.rating || 4.5,
        type: listing.type || 'Property',
        amenities: listing.amenities || ['Wellness-Friendly'],
      }));

      setListings(normalizedListings);
      setLoading(false);
    };

    loadAndFilterProperties();
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
                    src={listing.images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop'}
                    alt={listing.title || 'Property'}
                    fill
                    className="object-cover group-hover:scale-110 transition duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Wellness-Friendly
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white text-lg group-hover:text-emerald-500">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-medium text-gray-100">{listing.rating?.toFixed(1) || '4.5'}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{listing.location}</p>
                  {listing.guests && (
                    <p className="text-gray-500 text-xs mb-2">Up to {listing.guests} guests</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(listing.amenities || []).slice(0, 3).map((amenity) => (
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
