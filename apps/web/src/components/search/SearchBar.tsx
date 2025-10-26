'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar as CalendarIcon, Users } from 'lucide-react';

export function SearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests) params.set('guests', guests.toString());

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Location */}
        <div className="flex items-center space-x-2 border border-gray-300 rounded-lg px-4 py-3">
          <MapPin className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Where to?"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {/* Check-in */}
        <div className="flex items-center space-x-2 border border-gray-300 rounded-lg px-4 py-3">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {/* Check-out */}
        <div className="flex items-center space-x-2 border border-gray-300 rounded-lg px-4 py-3">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {/* Guests */}
        <div className="flex items-center justify-between space-x-2 border border-gray-300 rounded-lg px-4 py-3">
          <Users className="w-5 h-5 text-gray-400" />
          <select
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value))}
            className="flex-1 outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? 'Guest' : 'Guests'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleSearch}
        className="btn-primary w-full mt-4 flex items-center justify-center space-x-2"
      >
        <Search className="w-5 h-5" />
        <span>Search</span>
      </button>
    </div>
  );
}


