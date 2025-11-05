'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function SearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests) params.set('guests', guests.toString());
    router.push(`/search?${params.toString()}`);
  };

  return (
    <motion.div 
      className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-200/50"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-semibold text-gray-900">
              📍 Where
            </label>
            <input
              id="location"
              type="text"
              placeholder="City, state, or region"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="checkIn" className="block text-sm font-semibold text-gray-900">
              📅 Check In
            </label>
            <input
              id="checkIn"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="checkOut" className="block text-sm font-semibold text-gray-900">
              📅 Check Out
            </label>
            <input
              id="checkOut"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="guests" className="block text-sm font-semibold text-gray-900">
              👥 Guests
            </label>
            <select
              id="guests"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <motion.button
          type="submit"
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl hover:shadow-green-500/30"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          🔍 Search Properties
        </motion.button>
      </form>
    </motion.div>
  );
}
