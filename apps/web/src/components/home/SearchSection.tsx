'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Bed, Home, Building, Trees, Sparkles } from 'lucide-react';

interface Property {
  id: string;
  location: string;
  guests?: number;
  [key: string]: any;
}

interface SearchSectionProps {
  className?: string;
  initialValues?: {
    location?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    kids?: number;
    pets?: number;
    categories?: string[];
  };
  enableNegativeMargin?: boolean;
}

export function SearchSection({ className = '', initialValues, enableNegativeMargin = true }: SearchSectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialValues?.categories || []);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(initialValues?.location || '');
  const [checkIn, setCheckIn] = useState(initialValues?.checkIn || '');
  const [checkOut, setCheckOut] = useState(initialValues?.checkOut || '');
  const [guests, setGuests] = useState(initialValues?.guests || 1);
  const [kids, setKids] = useState(initialValues?.kids || 0);
  const [pets, setPets] = useState(initialValues?.pets || 0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Update state when initialValues change
  useEffect(() => {
    if (initialValues) {
      if (initialValues.location !== undefined) setSelectedLocation(initialValues.location);
      if (initialValues.checkIn !== undefined) setCheckIn(initialValues.checkIn);
      if (initialValues.checkOut !== undefined) setCheckOut(initialValues.checkOut);
      if (initialValues.guests !== undefined) setGuests(initialValues.guests);
      if (initialValues.kids !== undefined) setKids(initialValues.kids);
      if (initialValues.pets !== undefined) setPets(initialValues.pets);
      if (initialValues.categories !== undefined) setSelectedCategories(initialValues.categories);
    }
  }, [initialValues]);

  const categories = [
    {
      id: '1-bed',
      label: '1 Bed',
      icon: <Bed className="w-5 h-5" />
    },
    {
      id: '2-bed',
      label: '2 Bed',
      icon: <Bed className="w-5 h-5" />
    },
    {
      id: 'studios',
      label: 'Studios',
      icon: <Building className="w-5 h-5" />
    },
    {
      id: 'villas',
      label: 'Villas',
      icon: <Home className="w-5 h-5" />
    },
  ];

  // Fetch available locations from Supabase properties
  useEffect(() => {
    const loadLocations = async () => {
      const allLocations = new Set<string>();

      try {
        const supabase = createClient();
        console.log('[SearchSection] Loading locations from Supabase...');
        const { data: propertiesData, error } = await supabase
          .from('properties')
          .select('location')
          .eq('status', 'active')
          .not('location', 'is', null);

        if (error) {
          console.error('[SearchSection] Supabase error loading locations:', error);
        }

        if (propertiesData) {
          console.log(`[SearchSection] Found ${propertiesData.length} active properties with locations`);
          propertiesData.forEach((p: any) => {
            if (p.location) {
              allLocations.add(p.location);
            }
          });
        }

        // Fallback to localStorage if Supabase is not configured or has no data
        if (allLocations.size === 0) {
          console.log('[SearchSection] No locations found in Supabase, checking localStorage...');
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('properties_')) {
              try {
                const properties = JSON.parse(localStorage.getItem(key) || '[]') as Property[];
                properties.forEach(property => {
                  if (property.location && (property.status === 'active' || !property.status)) {
                    allLocations.add(property.location);
                  }
                });
              } catch (e) {
                console.error('Error parsing properties from localStorage:', e);
              }
            }
          });
        }

        const uniqueLocations = Array.from(allLocations).sort();
        console.log('[SearchSection] Final unique locations:', uniqueLocations);
        setLocations(uniqueLocations);
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

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;

    setIsAiLoading(true);
    setAiResults([]);

    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
      });

      const data = await response.json();
      if (data.results) {
        setAiResults(data.results);
      } else {
        toast.error(data.error || 'AI search failed');
      }
    } catch (error) {
      console.error('AI search error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredLocations = locations.filter(loc =>
    loc.toLowerCase().includes(selectedLocation.toLowerCase())
  );

  const displayLocations = (selectedLocation === '' || locations.includes(selectedLocation)) 
    ? locations 
    : filteredLocations;

  return (
    <div className={`container mx-auto px-3 md:px-6 ${enableNegativeMargin ? '-mt-8 sm:-mt-12 md:-mt-16 lg:-mt-20' : ''} relative z-30 pb-12 md:pb-20 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-surface shadow-[0_40px_80px_rgba(0,0,0,0.6)] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 lg:p-10 border border-white/5 relative"
      >
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">Find Your Perfect Stay</h2>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setIsAiMode(false)}
                className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all ${!isAiMode ? 'bg-primary-500 text-black' : 'text-muted hover:text-white'}`}
              >
                Standard
              </button>
              <button
                onClick={() => setIsAiMode(true)}
                className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${isAiMode ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'text-muted hover:text-white'}`}
              >
                <Sparkles size={12} />
                AI Vibe Search
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white hover:text-primary-500 transition-colors p-2"
            aria-label={isCollapsed ? 'Expand search' : 'Collapse search'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {!isCollapsed && (
          <>
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary-500/5 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2" />

            {/* Search Inputs */}
            <div className="relative space-y-8">
              {isAiMode ? (
                <div className="space-y-6">
                  <div className="relative">
                    <label className="block text-sm font-bold text-muted uppercase tracking-wider ml-1 mb-3">Describe your vibe</label>
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-primary-500 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
                      <div className="relative flex items-center bg-gray-900 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="pl-6 text-purple-500">
                          <Sparkles size={20} />
                        </div>
                        <input
                          type="text"
                          value={aiQuery}
                          onChange={(e) => setAiQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                          placeholder="e.g. 'Looking for a peaceful mountain cabin for 4 with a hot tub and amazing views'"
                          className="w-full bg-transparent px-6 py-5 text-white placeholder-white/20 focus:outline-none font-medium"
                        />
                        <button
                          onClick={handleAiSearch}
                          disabled={isAiLoading || !aiQuery.trim()}
                          className="mr-2 px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2"
                        >
                          {isAiLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>Inspire Me</span>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AI Results */}
                  {aiResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {aiResults.map((result, i) => (
                        <Link
                          key={result.id}
                          href={`/listings/${result.id}`}
                          className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all group"
                        >
                          <div className="flex gap-4">
                            <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                              <img src={result.images[0]} alt={result.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold truncate group-hover:text-primary-500 transition-colors">{result.name}</h4>
                              <p className="text-muted text-xs truncate mb-2">{result.location}</p>
                              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
                                <p className="text-[10px] text-purple-300 italic line-clamp-2">" {result.matchReason} "</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto] gap-6 items-end">
                  {/* Where to? - Location Input */}
                  <div className="space-y-3" ref={locationDropdownRef}>
                    <label className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">Location</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLocationDropdown(!showLocationDropdown);
                          setShowDatePicker(false);
                          setShowGuestPicker(false);
                        }}
                        className="w-full flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
                      >
                        <svg className="w-5 h-5 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-white font-medium">
                          {selectedLocation || 'Where are you going?'}
                        </span>
                      </button>

                      {showLocationDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-4 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-50 p-3">
                          <input
                            ref={locationInputRef}
                            type="text"
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            placeholder="Search vibes..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                            autoFocus
                          />
                          <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-hide">
                            {displayLocations.length > 0 ? (
                              displayLocations.map((location) => (
                                <button
                                  key={location}
                                  type="button"
                                  onClick={() => handleLocationSelect(location)}
                                  className="w-full text-left px-4 py-3 text-white hover:bg-primary-500 hover:text-black rounded-xl transition-all font-medium"
                                >
                                  {location}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-muted text-sm italic">No locations found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dates - Date Picker */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">Journey Dates</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDatePicker(!showDatePicker);
                          setShowLocationDropdown(false);
                          setShowGuestPicker(false);
                        }}
                        className="w-full flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
                      >
                        <svg className="w-5 h-5 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-white font-medium">
                          {checkIn && checkOut
                            ? `${new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : 'Choose when to wander'
                          }
                        </span>
                      </button>

                      {showDatePicker && (
                        <div className="absolute top-full left-0 right-0 mt-4 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-50 p-6 min-w-[320px]">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-muted uppercase">Check In</label>
                              <input
                                type="date"
                                value={checkIn}
                                onChange={(e) => {
                                  setCheckIn(e.target.value);
                                  if (checkOut && e.target.value >= checkOut) setCheckOut('');
                                }}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-muted uppercase">Check Out</label>
                              <input
                                type="date"
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                                min={checkIn || new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(false)}
                            className="mt-6 w-full btn-primary !py-3"
                          >
                            Confirm Dates
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guests - Guest Picker */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">Travellers</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowGuestPicker(!showGuestPicker);
                          setShowLocationDropdown(false);
                          setShowDatePicker(false);
                        }}
                        className="w-full flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
                      >
                        <svg className="w-5 h-5 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-white font-medium">
                          {guests + kids} {guests + kids === 1 ? 'Guest' : 'Guests'}
                          {pets > 0 && `, ${pets} ${pets === 1 ? 'Pet' : 'Pets'}`}
                        </span>
                      </button>

                      {showGuestPicker && (
                        <div className="absolute top-full right-0 lg:right-auto lg:left-0 mt-4 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-50 p-6 min-w-[280px]">
                          <div className="space-y-6">
                            {/* Adults */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-white font-bold">Adults</span>
                                <p className="text-muted text-xs">Ages 13+</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => handleGuestChange(-1)}
                                  disabled={guests <= 1}
                                  className="w-10 h-10 rounded-xl border border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 disabled:opacity-30 transition-all flex items-center justify-center font-bold"
                                >
                                  −
                                </button>
                                <span className="text-white font-bold w-4 text-center">{guests}</span>
                                <button
                                  type="button"
                                  onClick={() => handleGuestChange(1)}
                                  className="w-10 h-10 rounded-xl border border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 transition-all flex items-center justify-center font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Kids */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-white font-bold">Children</span>
                                <p className="text-muted text-xs">Ages 2-12</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => handleKidsChange(-1)}
                                  disabled={kids <= 0}
                                  className="w-10 h-10 rounded-xl border border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 disabled:opacity-30 transition-all flex items-center justify-center font-bold"
                                >
                                  −
                                </button>
                                <span className="text-white font-bold w-4 text-center">{kids}</span>
                                <button
                                  type="button"
                                  onClick={() => handleKidsChange(1)}
                                  className="w-10 h-10 rounded-xl border border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 transition-all flex items-center justify-center font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Pets */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-white font-bold">Pets</span>
                                <p className="text-muted text-xs">Furry friends welcome</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => handlePetsChange(-1)}
                                  disabled={pets <= 0}
                                  className="w-10 h-10 rounded-xl border border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 disabled:opacity-30 transition-all flex items-center justify-center font-bold"
                                >
                                  −
                                </button>
                                <span className="text-white font-bold w-4 text-center">{pets}</span>
                                <button
                                  type="button"
                                  onClick={() => handlePetsChange(1)}
                                  className="w-10 h-10 rounded-xl border border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 transition-all flex items-center justify-center font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowGuestPicker(false)}
                            className="mt-8 w-full btn-primary !py-3"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Search Button */}
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="btn-primary !px-12 !py-[1.125rem] shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="font-bold">Search</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-4 pt-4">
              <span className="text-sm font-bold text-muted uppercase tracking-widest self-center mr-2">Quick Vibes:</span>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-full border transition-all ${selectedCategories.includes(category.id)
                    ? 'bg-primary-500 border-primary-500 text-black font-bold scale-105 shadow-[0_10px_20px_rgba(0,230,118,0.2)]'
                    : 'bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {category.icon}
                  <span className="text-sm font-bold">{category.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

