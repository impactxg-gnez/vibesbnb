'use client';

import Link from 'next/link';

export function Hero() {
  return (
    <div className="relative bg-gradient-to-r from-green-600 to-emerald-700 text-white">
      <div className="container mx-auto px-4 py-20 sm:py-32">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            Your 420-Friendly Getaway Awaits
          </h1>
          <p className="text-xl sm:text-2xl mb-8 text-green-50">
            Discover cannabis-welcoming accommodations, wellness experiences, and unforgettable stays
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/search"
              className="inline-block bg-white text-green-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-green-50 transition text-center"
            >
              Explore Listings
            </Link>
            <Link
              href="/host"
              className="inline-block bg-green-800 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-green-900 transition border-2 border-white text-center"
            >
              Become a Host
            </Link>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
    </div>
  );
}

