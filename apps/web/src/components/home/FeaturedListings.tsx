'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ListingCard } from '@/components/listings/ListingCard';
import { Listing } from '@vibesbnb/shared';

export function FeaturedListings() {
  const { data: listings, isLoading } = useQuery({
    queryKey: ['featured-listings'],
    queryFn: () => api.get<Listing[]>('/listings'),
  });

  if (isLoading) {
    return (
      <section id="featured-listings" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Featured Listings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-80 bg-gray-200 rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="featured-listings" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Featured Listings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings?.slice(0, 8).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  );
}


