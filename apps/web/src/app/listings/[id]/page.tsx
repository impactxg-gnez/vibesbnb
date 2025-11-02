'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function ListingDetailPage() {
  const params = useParams();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  // Mock data - will be replaced with actual API call
  const listing = {
    id: params.id,
    title: 'Mountain View Cabin',
    location: 'Colorado, USA',
    price: 150,
    rating: 4.9,
    reviews: 127,
    images: [
      'https://via.placeholder.com/800x600',
      'https://via.placeholder.com/800x600',
      'https://via.placeholder.com/800x600',
    ],
    type: 'Entire Cabin',
    guests: 4,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    host: {
      name: 'Sarah',
      image: 'https://via.placeholder.com/100x100',
      joinedDate: '2022',
    },
    description: 'Escape to this stunning mountain cabin with breathtaking views and a welcoming atmosphere for cannabis enthusiasts. Perfect for a relaxing getaway with friends or family.',
    amenities: [
      '420-Friendly',
      'Hot Tub',
      'Mountain View',
      'Fireplace',
      'Kitchen',
      'WiFi',
      'Parking',
      'Hiking Trails',
    ],
    houseRules: [
      'Check-in after 3:00 PM',
      'Check-out before 11:00 AM',
      'Respectful cannabis consumption allowed',
      'No parties or events',
      'No smoking indoors (cannabis or tobacco)',
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Image Gallery */}
      <div className="container mx-auto px-4 py-8">
        <Link href="/search" className="text-green-600 hover:text-green-700 mb-4 inline-block">
          ← Back to search
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span className="font-semibold">{listing.rating}</span>
            <span className="text-gray-600">({listing.reviews} reviews)</span>
          </div>
          <span className="text-gray-600">{listing.location}</span>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8 h-96">
          <div className="col-span-2 row-span-2 relative rounded-l-xl overflow-hidden">
            <Image src={listing.images[0]} alt={listing.title} fill className="object-cover" />
          </div>
          <div className="relative rounded-tr-xl overflow-hidden">
            <Image src={listing.images[1]} alt={listing.title} fill className="object-cover" />
          </div>
          <div className="relative rounded-tr-xl overflow-hidden">
            <Image src={listing.images[2]} alt={listing.title} fill className="object-cover" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="border-b pb-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">
                {listing.type} hosted by {listing.host.name}
              </h2>
              <div className="flex gap-4 text-gray-600">
                <span>{listing.guests} guests</span>
                <span>•</span>
                <span>{listing.bedrooms} bedrooms</span>
                <span>•</span>
                <span>{listing.beds} beds</span>
                <span>•</span>
                <span>{listing.bathrooms} bathrooms</span>
              </div>
            </div>

            <div className="border-b pb-6 mb-6">
              <div className="bg-green-50 border border-green-600 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🌿</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">420-Friendly Property</h3>
                    <p className="text-gray-700 text-sm">
                      This host welcomes responsible cannabis consumption
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">{listing.description}</p>
            </div>

            <div className="border-b pb-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">What this place offers</h3>
              <div className="grid grid-cols-2 gap-4">
                {listing.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-3">
                    <span className="text-green-600">✓</span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pb-6">
              <h3 className="text-xl font-semibold mb-4">House Rules</h3>
              <ul className="space-y-2">
                {listing.houseRules.map((rule) => (
                  <li key={rule} className="text-gray-700">
                    • {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="border border-gray-300 rounded-xl p-6 sticky top-20">
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold">${listing.price}</span>
                <span className="text-gray-600">/ night</span>
              </div>

              <div className="border border-gray-300 rounded-xl mb-4">
                <div className="grid grid-cols-2 border-b">
                  <div className="p-3 border-r">
                    <label className="text-xs font-semibold uppercase text-gray-700">
                      Check-in
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full mt-1 text-sm"
                    />
                  </div>
                  <div className="p-3">
                    <label className="text-xs font-semibold uppercase text-gray-700">
                      Check-out
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full mt-1 text-sm"
                    />
                  </div>
                </div>
                <div className="p-3">
                  <label className="text-xs font-semibold uppercase text-gray-700">
                    Guests
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full mt-1 text-sm"
                  >
                    {[1, 2, 3, 4].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition mb-4">
                Reserve
              </button>

              <p className="text-center text-sm text-gray-600 mb-4">
                You won't be charged yet
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">${listing.price} x 3 nights</span>
                  <span>${listing.price * 3}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service fee</span>
                  <span>${(listing.price * 3 * 0.1).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(listing.price * 3 * 1.1).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

