'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface Property {
  id: string;
  location: string;
  guests?: number;
  [key: string]: any;
}

export function SearchSection() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [kids, setKids] = useState(0);
  const [pets, setPets] = useState(0);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const categories = [
    { id: 'spa', label: 'Spa', icon: '💆' },
    { id: 'yoga', label: 'Yoga', icon: '🧘' },
    { id: 'cabins', label: 'Cabins', icon: '🏡' },
  ];

  // Fetch available locations from Supabase properties
  useEffect(() => {
    const loadLocations = async () => {
      const allLocations = new Set<string>();
      
      try {
        const supabase = createClient();
        const { data: propertiesData, error } = await supabase
          .from('properties')
          .select('location')
          .eq('status', 'active')
          .not('location', 'is', null);

        if (!error && propertiesData) {
          propertiesData.forEach((p: any) => {
            if (p.location) {
              allLocations.add(p.location);
            }
          });
        }

        // Fallback to localStorage if Supabase is not configured or has no data
        if (allLocations.size === 0) {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('properties_')) {
              try {
                const properties = JSON.parse(localStorage.getItem(key) || '[]') as Property[];
                properties.forEach(property => {
                  if (property.location) {
                    allLocations.add(property.location);
                  }
                });
              } catch (e) {
                console.error('Error parsing properties:', e);
              }
            }
          });
        }

        setLocations(Array.from(allLocations).sort());
      } catch (error) {
        console.error('Error loading locations:', error);
        setLocations([]);
      }
    };

    loadLocations();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };

    if (showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLocationDropdown]);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setShowLocationDropdown(false);
  };

  const handleGuestChange = (delta: number) => {
    setGuests(prev => Math.max(1, prev + delta));
  };

  const handleKidsChange = (delta: number) => {
    setKids(prev => Math.max(0, prev + delta));
  };

  const handlePetsChange = (delta: number) => {
    setPets(prev => Math.max(0, prev + delta));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedLocation) params.set('location', selectedLocation);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests) params.set('guests', guests.toString());
    if (kids > 0) params.set('kids', kids.toString());
    if (pets > 0) params.set('pets', pets.toString());
    if (selectedCategories.length > 0) {
      params.set('categories', selectedCategories.join(','));
    }
    router.push(`/search?${params.toString()}`);
  };

  const filteredLocations = locations.filter(loc =>
    loc.toLowerCase().includes(selectedLocation.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 -mt-16 relative z-10 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-charcoal-900 rounded-3xl p-6 shadow-2xl border border-charcoal-800"
      >
        {/* Search Inputs */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 flex items-center justify-center text-mist-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Where to? - Location Input */}
            <div className="relative" ref={locationDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowLocationDropdown(!showLocationDropdown);
                  setShowDatePicker(false);
                  setShowGuestPicker(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 bg-charcoal-800 rounded-2xl text-left hover:bg-charcoal-700 transition"
              >
                <svg className="w-5 h-5 text-mist-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-mist-100 flex-1 text-left">
                  {selectedLocation || 'Where to?'}
                </span>
              </button>
              
              {showLocationDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-charcoal-800 rounded-2xl border border-charcoal-700 shadow-xl z-50 max-h-64 overflow-y-auto">
                  <div className="p-2">
                    <input
                      ref={locationInputRef}
                      type="text"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      placeholder="Search locations..."
                      className="w-full px-3 py-2 bg-charcoal-900 border border-charcoal-700 rounded-xl text-mist-100 placeholder-mist-500 focus:outline-none focus:ring-2 focus:ring-earth-500 mb-2"
                      autoFocus
                    />
                    {filteredLocations.length > 0 ? (
                      <div className="space-y-1">
                        {filteredLocations.map((location) => (
                          <button
                            key={location}
                            type="button"
                            onClick={() => handleLocationSelect(location)}
                            className="w-full text-left px-3 py-2 text-mist-100 hover:bg-charcoal-700 rounded-lg transition"
                          >
                            {location}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-mist-400 text-sm">No locations found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Dates - Date Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  setShowLocationDropdown(false);
                  setShowGuestPicker(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 bg-charcoal-800 rounded-2xl text-left hover:bg-charcoal-700 transition"
              >
                <svg className="w-5 h-5 text-mist-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-mist-100 flex-1 text-left">
                  {checkIn && checkOut 
                    ? `${new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'Dates'
                  }
                </span>
              </button>
              
              {showDatePicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-charcoal-800 rounded-2xl border border-charcoal-700 shadow-xl z-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-mist-400 mb-2">Check In</label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => {
                          setCheckIn(e.target.value);
                          if (checkOut && e.target.value >= checkOut) {
                            setCheckOut('');
                          }
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-charcoal-900 border border-charcoal-700 rounded-xl text-mist-100 focus:outline-none focus:ring-2 focus:ring-earth-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-mist-400 mb-2">Check Out</label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        min={checkIn || new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-charcoal-900 border border-charcoal-700 rounded-xl text-mist-100 focus:outline-none focus:ring-2 focus:ring-earth-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="mt-4 w-full px-4 py-2 bg-earth-500 hover:bg-earth-600 text-white rounded-xl transition"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
            
            {/* Guests - Guest Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowGuestPicker(!showGuestPicker);
                  setShowLocationDropdown(false);
                  setShowDatePicker(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 bg-charcoal-800 rounded-2xl text-left hover:bg-charcoal-700 transition"
              >
                <svg className="w-5 h-5 text-mist-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-mist-100 flex-1 text-left">
                  {guests} {guests === 1 ? 'Guest' : 'Guests'}
                  {kids > 0 && `, ${kids} ${kids === 1 ? 'Kid' : 'Kids'}`}
                  {pets > 0 && `, ${pets} ${pets === 1 ? 'Pet' : 'Pets'}`}
                </span>
              </button>
              
              {showGuestPicker && (
                <div className="absolute top-full right-0 mt-2 bg-charcoal-800 rounded-2xl border border-charcoal-700 shadow-xl z-50 p-4 min-w-[250px]">
                  <div className="space-y-4">
                    {/* Guests */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-mist-100 font-medium">Guests</span>
                        <p className="text-mist-400 text-xs">Ages 13+</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleGuestChange(-1)}
                          disabled={guests <= 1}
                          className="w-8 h-8 rounded-full border-2 border-charcoal-600 text-mist-400 hover:border-earth-500 hover:text-earth-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-mist-100 font-semibold w-8 text-center">{guests}</span>
                        <button
                          type="button"
                          onClick={() => handleGuestChange(1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-600 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-charcoal-700"></div>

                    {/* Kids */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-mist-100 font-medium">Kids</span>
                        <p className="text-mist-400 text-xs">Ages 2-12</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleKidsChange(-1)}
                          disabled={kids <= 0}
                          className="w-8 h-8 rounded-full border-2 border-charcoal-600 text-mist-400 hover:border-earth-500 hover:text-earth-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-white font-semibold w-8 text-center">{kids}</span>
                        <button
                          type="button"
                          onClick={() => handleKidsChange(1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-600 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-charcoal-700"></div>

                    {/* Pets */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-mist-100 font-medium">Pets</span>
                        <p className="text-mist-400 text-xs">Bringing a service animal?</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handlePetsChange(-1)}
                          disabled={pets <= 0}
                          className="w-8 h-8 rounded-full border-2 border-charcoal-600 text-mist-400 hover:border-earth-500 hover:text-earth-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-white font-semibold w-8 text-center">{pets}</span>
                        <button
                          type="button"
                          onClick={() => handlePetsChange(1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-600 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGuestPicker(false)}
                    className="mt-4 w-full px-4 py-2 bg-earth-500 hover:bg-earth-600 text-white rounded-xl transition"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition ${
                selectedCategories.includes(category.id)
                  ? 'bg-earth-500 text-white'
                  : 'bg-charcoal-800 text-mist-300 hover:bg-charcoal-700'
              }`}
            >
              <span>{category.icon}</span>
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          ))}
        </div>

        {/* Search Button */}
        <button
          type="button"
          onClick={handleSearch}
          className="w-full bg-earth-500 hover:bg-earth-600 text-white font-semibold py-4 rounded-2xl transition"
        >
          Search stays
        </button>
      </motion.div>
    </div>
  );
}

