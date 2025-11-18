'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

export function SearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [kids, setKids] = useState(0);
  const [pets, setPets] = useState(0);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<string[]>([]);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available locations from properties
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const supabase = createClient();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const isSupabaseConfigured = supabaseUrl && 
                                      supabaseUrl !== '' &&
                                      supabaseUrl !== 'https://placeholder.supabase.co' &&
                                      supabaseKey &&
                                      supabaseKey !== '' &&
                                      supabaseKey !== 'placeholder-key';
        
        let allLocations: string[] = [];
        
        if (isSupabaseConfigured) {
          // Fetch locations from Supabase
          const { data, error } = await supabase
            .from('properties')
            .select('location')
            .eq('status', 'active')
            .not('location', 'is', null);

          if (!error && data) {
            allLocations = data
              .map((p: any) => p.location)
              .filter((loc: string) => loc && loc.trim() !== '');
          }
        }
        
        // Also check localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('properties_')) {
            try {
              const userProperties = JSON.parse(localStorage.getItem(key) || '[]');
              const activeProperties = userProperties.filter((p: any) => 
                (p.status === 'active' || !p.status) && p.location
              );
              activeProperties.forEach((p: any) => {
                if (p.location && !allLocations.includes(p.location)) {
                  allLocations.push(p.location);
                }
              });
            } catch (e) {
              // Skip invalid entries
            }
          }
        });
        
        // Remove duplicates and sort
        const uniqueLocations = Array.from(new Set(allLocations))
          .filter((loc: string) => loc && loc.trim() !== '')
          .sort();
        
        setAvailableLocations(uniqueLocations);
        setFilteredLocations(uniqueLocations);
      } catch (error) {
        console.error('[SearchBar] Error fetching locations:', error);
      }
    };

    fetchLocations();
  }, []);

  // Filter locations based on input
  useEffect(() => {
    if (location.trim() === '') {
      setFilteredLocations(availableLocations);
    } else {
      const filtered = availableLocations.filter(loc =>
        loc.toLowerCase().includes(location.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [location, availableLocations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationSelect = (selectedLocation: string) => {
    setLocation(selectedLocation);
    setShowLocationDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests) params.set('guests', guests.toString());
    if (kids > 0) params.set('kids', kids.toString());
    if (pets > 0) params.set('pets', pets.toString());
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2 relative">
            <label htmlFor="location" className="block text-sm font-semibold text-gray-900">
              📍 Where
            </label>
            <div className="relative">
              <input
                id="location"
                ref={locationInputRef}
                type="text"
                placeholder="City, state, or region"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setShowLocationDropdown(true);
                }}
                onFocus={() => setShowLocationDropdown(true)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
              />
              {showLocationDropdown && filteredLocations.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border-2 border-gray-200 shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  <div className="p-2">
                    {filteredLocations.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => handleLocationSelect(loc)}
                        className="w-full text-left px-4 py-2 text-gray-900 hover:bg-green-50 rounded-lg transition"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="guests" className="block text-sm font-semibold text-gray-900">
              👥 Guests (Ages 13+)
            </label>
            <select
              id="guests"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="kids" className="block text-sm font-semibold text-gray-900">
              👶 Kids (Ages 2-12)
            </label>
            <select
              id="kids"
              value={kids}
              onChange={(e) => setKids(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Kid' : 'Kids'}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="pets" className="block text-sm font-semibold text-gray-900">
              🐾 Pets
            </label>
            <select
              id="pets"
              value={pets}
              onChange={(e) => setPets(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900"
            >
              {[0, 1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Pet' : 'Pets'}
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
