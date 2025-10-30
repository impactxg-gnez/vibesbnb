'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ListingCard } from '@/components/listings/ListingCard';
import { SearchBar } from '@/components/search/SearchBar';
import { Loader2 } from 'lucide-react';
import { Listing } from '@vibesbnb/shared';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);

  const location = searchParams.get('location') || '';
  const tags = searchParams.get('tags') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = searchParams.get('guests') || '';

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [listings, location, tags, checkIn, checkOut, guests]);

  const fetchListings = async () => {
    try {
      const data = await api.get('/listings');
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = listings.filter((listing) => listing.status === 'active');

    // Filter by location
    if (location) {
      const locationLower = location.toLowerCase();
      filtered = filtered.filter(
        (listing) =>
          listing.address.city.toLowerCase().includes(locationLower) ||
          listing.address.state.toLowerCase().includes(locationLower) ||
          listing.title.toLowerCase().includes(locationLower)
      );
    }

    // Filter by wellness tags
    if (tags) {
      const tagList = tags.split(',');
      filtered = filtered.filter((listing) =>
        tagList.some((tag) => listing.wellnessTags.includes(tag))
      );
    }

    // Filter by guests
    if (guests) {
      const guestCount = parseInt(guests);
      filtered = filtered.filter((listing: any) => listing.maxGuests >= guestCount);
    }

    // TODO: Filter by dates when calendar availability is implemented

    setFilteredListings(filtered);
  };

  const getPageTitle = () => {
    if (tags) {
      const tagMap: Record<string, string> = {
        '420_friendly': '420 Friendly',
        'yoga_space': 'Yoga Spaces',
        'meditation_room': 'Meditation',
        'spa_facilities': 'Spa & Wellness',
        'smoke_free': 'Smoke Free',
        'nature_retreat': 'Nature Retreat',
      };
      return tagMap[tags] || 'Search Results';
    }
    if (location) {
      return `Properties in ${location}`;
    }
    return 'Search Results';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Searching for properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <SearchBar />
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{getPageTitle()}</h1>
          <p className="text-gray-600">
            {filteredListings.length} {filteredListings.length === 1 ? 'property' : 'properties'} found
          </p>
        </div>

        {filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No properties found</h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or browse all available properties
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse All Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

