import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star } from 'lucide-react';
import { Listing } from '@vibesbnb/shared';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link href={`/listings/${listing.id}`} className="group">
      <div className="card overflow-hidden">
        {/* Image */}
        <div className="relative h-48 bg-gray-200">
          <Image
            src={`https://source.unsplash.com/800x600/?wellness,${listing.address.city}`}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <button
            className="absolute top-3 right-3 p-2 bg-white/80 rounded-full hover:bg-white"
            onClick={(e) => {
              e.preventDefault();
              // TODO: Add to favorites
            }}
          >
            <Heart className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-1">
              {listing.title}
            </h3>
            <div className="flex items-center space-x-1 text-sm">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>4.8</span>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-2">
            {listing.address.city}, {listing.address.state}
          </p>

          <div className="flex flex-wrap gap-1 mb-3">
            {listing.wellnessTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full"
              >
                {tag.replace('_', ' ')}
              </span>
            ))}
          </div>

          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-bold">
              ${(listing.basePrice / 100).toFixed(0)}
            </span>
            <span className="text-gray-600 text-sm">/ night</span>
          </div>
        </div>
      </div>
    </Link>
  );
}


