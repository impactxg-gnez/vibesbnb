'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Bed, Home, Building, Sparkles } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { formatCalendarDate, todayLocalYmd } from '@/lib/dateUtils';
import { cityLabelFromPropertyLocation } from '@/lib/propertyLocationCity';
import { writeStaySearch } from '@/lib/staySearchParams';
import {
  PREFER_WELLNESS_DEFAULT,
  VIBE_FIRST_QUERY_KEY,
  readLocalPreferWellnessFriendly,
  writeLocalPreferWellnessFriendly,
} from '@/lib/preferWellnessFriendly';

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
  /** When set, location suggestions and search results are limited to this host. */
  hostId?: string;
  /** Optional override for the search panel heading (e.g. host first name). */
  heading?: string;
}

export function SearchSection({
  className = '',
  initialValues,
  enableNegativeMargin = true,
  hostId,
  heading,
}: SearchSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
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
  const [vibeFirst, setVibeFirst] = useState(PREFER_WELLNESS_DEFAULT);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get(VIBE_FIRST_QUERY_KEY);
      if (fromUrl === '1' || fromUrl === 'true') {
        setVibeFirst(true);
        return;
      }
      if (fromUrl === '0' || fromUrl === 'false') {
        setVibeFirst(false);
        return;
      }
      setVibeFirst(readLocalPreferWellnessFriendly());
    } catch {
      setVibeFirst(PREFER_WELLNESS_DEFAULT);
    }
  }, [pathname]);

  // Sync from URL/search props when those *values* change — not when the parent passes a new
  // `initialValues` object reference each render (that was resetting location/dates on every re-render).
  const ivLocation = initialValues?.location;
  const ivCheckIn = initialValues?.checkIn;
  const ivCheckOut = initialValues?.checkOut;
  const ivGuests = initialValues?.guests;
  const ivKids = initialValues?.kids;
  const ivPets = initialValues?.pets;
  const ivCategoriesKey = initialValues?.categories?.join(',') ?? '';
  const hasInitialValues = initialValues != null;

  useEffect(() => {
    if (!hasInitialValues || !initialValues) return;
    if (ivLocation !== undefined) setSelectedLocation(ivLocation);
    if (ivCheckIn !== undefined) setCheckIn(ivCheckIn);
    if (ivCheckOut !== undefined) setCheckOut(ivCheckOut);
    if (ivGuests !== undefined) setGuests(ivGuests);
    if (ivKids !== undefined) setKids(ivKids);
    if (ivPets !== undefined) setPets(ivPets);
    if (initialValues.categories !== undefined) {
      setSelectedCategories(initialValues.categories);
    }
  }, [
    hasInitialValues,
    ivLocation,
    ivCheckIn,
    ivCheckOut,
    ivGuests,
    ivKids,
    ivPets,
    ivCategoriesKey,
  ]);

  // Persist stay selection so property cards / listing booking widget can reuse dates
  useEffect(() => {
    writeStaySearch({ checkIn, checkOut, guests, kids, pets });
  }, [checkIn, checkOut, guests, kids, pets]);

  const categories = [
    { id: 'Entire House', label: 'House', icon: <Home className="w-5 h-5" /> },
    { id: 'Apartment', label: 'Apartment', icon: <Building className="w-5 h-5" /> },
    { id: 'Condo', label: 'Condo', icon: <Building className="w-5 h-5" /> },
    { id: 'Private Rooms', label: 'Private Room', icon: <Bed className="w-5 h-5" /> },
    { id: 'Room inside property', label: 'Shared Room', icon: <Bed className="w-5 h-5" /> },
  ];

  // Fetch available locations from Supabase properties (optionally scoped to one host)
  useEffect(() => {
    const loadLocations = async () => {
      const allLocations = new Set<string>();

      try {
        const supabase = createClient();
        let query = supabase
          .from('properties')
          .select('location')
          .eq('status', 'active');
        if (hostId) {
          query = query.eq('host_id', hostId);
        }
        const { data: propertiesData, error } = await query;

        if (error) {
          console.error('[SearchSection] Supabase error loading locations:', error);
        }

        if (propertiesData) {
          propertiesData.forEach((p: { location?: string | null }) => {
            const raw = (p.location || '').trim();
            const city = cityLabelFromPropertyLocation(raw);
            if (city) allLocations.add(city);
          });
        }

        // Fallback to localStorage if Supabase is not configured or has no data
        if (allLocations.size === 0) {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('properties_')) {
              try {
                const properties = JSON.parse(localStorage.getItem(key) || '[]') as Array<{
                  location?: string;
                  status?: string;
                }>;
                properties.forEach(property => {
                  const raw = (property.location || '').trim();
                  if (raw && (property.status === 'active' || !property.status)) {
                    const city = cityLabelFromPropertyLocation(raw);
                    if (city) allLocations.add(city);
                  }
                });
              } catch (e) {
                console.error('Error parsing properties from localStorage:', e);
              }
            }
          });
        }

        const uniqueLocations = Array.from(allLocations).sort();
        setLocations(uniqueLocations);
      } catch (error) {
        console.error('Error loading locations:', error);
        setLocations([]);
      }
    };

    loadLocations();
  }, [hostId]);

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

  /** Merge current form state into query params (preserves unrelated keys like `sort`). */
  const applySearchFormToParams = (params: URLSearchParams, categories: string[]) => {
    if (selectedLocation) params.set('location', selectedLocation);
    else params.delete('location');
    if (checkIn) params.set('checkIn', checkIn);
    else params.delete('checkIn');
    if (checkOut) params.set('checkOut', checkOut);
    else params.delete('checkOut');
    if (guests) params.set('guests', guests.toString());
    else params.delete('guests');
    if (kids > 0) params.set('kids', kids.toString());
    else params.delete('kids');
    if (pets > 0) params.set('pets', pets.toString());
    else params.delete('pets');
    if (categories.length > 0) params.set('categories', categories.join(','));
    else params.delete('categories');
    if (hostId) params.set('host', hostId);
    params.set(VIBE_FIRST_QUERY_KEY, vibeFirst ? '1' : '0');
  };

  const toggleCategory = (id: string) => {
    const newCategories = selectedCategories.includes(id) 
      ? selectedCategories.filter(c => c !== id) 
      : [...selectedCategories, id];
    
    setSelectedCategories(newCategories);
    
    // Start from current URL so we keep sort/filters, then overlay form fields.
    // On the home page `search` is empty — without this, only `categories` is sent and
    // location / dates / travellers entered on the hero are lost.
    const params = new URLSearchParams(window.location.search);
    applySearchFormToParams(params, newCategories);
    router.push(`/search?${params.toString()}`);
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
    applySearchFormToParams(params, selectedCategories);
    router.push(`/search?${params.toString()}`);
  };

  const filteredLocations = locations.filter(loc =>
    loc.toLowerCase().includes(selectedLocation.toLowerCase())
  );

  const displayLocations = (selectedLocation === '' || locations.includes(selectedLocation)) 
    ? locations 
    : filteredLocations;

  const locationHeadingPart = selectedLocation.trim();
  const searchHeading =
    heading ||
    (hostId
      ? locationHeadingPart.length > 0
        ? `Search this host · ${locationHeadingPart}`
        : 'Search this host’s stays'
      : locationHeadingPart.length > 0
        ? `Find your ${locationHeadingPart} vibe`
        : 'Find Your Perfect Stay');

  return (
    <div className={`container mx-auto px-3 md:px-6 max-w-full ${enableNegativeMargin ? '-mt-8 sm:-mt-12 md:-mt-16 lg:-mt-20' : ''} relative z-30 pb-12 md:pb-20 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-surface shadow-[0_40px_80px_rgba(0,0,0,0.6)] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 lg:p-10 border border-white/5 relative min-w-0 w-full max-w-full"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-4 md:mb-6">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white break-words">{searchHeading}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <button
                type="button"
                role="switch"
                aria-checked={vibeFirst}
                aria-label="Show Full Vibe and Balcony Vibe stays first"
                title="Prioritize Full Vibe (green) and Balcony Vibe (gold) listings"
                onClick={() => {
                  const next = !vibeFirst;
                  setVibeFirst(next);
                  writeLocalPreferWellnessFriendly(next);
                  if (pathname === '/search') {
                    const params = new URLSearchParams(window.location.search);
                    applySearchFormToParams(params, selectedCategories);
                    params.set(VIBE_FIRST_QUERY_KEY, next ? '1' : '0');
                    router.replace(`/search?${params.toString()}`, { scroll: false });
                  }
                }}
                className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-2 transition-all border ${
                  vibeFirst
                    ? 'bg-[#193F25]/12 border-[#193F25]/45 text-[#193F25] dark:bg-emerald-500/20 dark:border-emerald-400/50 dark:text-emerald-200 dark:shadow-[0_0_14px_rgba(16,185,129,0.3)]'
                    : 'border-[#51372B]/20 text-[#51372B] hover:text-[#193F25] dark:border-white/10 dark:text-muted dark:hover:text-white'
                }`}
              >
                <span
                  className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                    vibeFirst ? 'bg-[#193F25] dark:bg-emerald-500' : 'bg-[#B8A487] dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-[#FAF3EA] dark:bg-white transition-transform ${
                      vibeFirst ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                Wellness first
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white hover:text-primary-500 transition-colors p-2 shrink-0 self-end sm:self-start"
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

        {/* Categories at Top */}
        <div className="flex items-center gap-2 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2 border-b border-white/5 mb-8">
          <button
            type="button"
            onClick={() => {
              setSelectedCategories([]);
              if (pathname === '/search') {
                const params = new URLSearchParams(window.location.search);
                applySearchFormToParams(params, []);
                router.push(`/search?${params.toString()}`);
              }
            }}
            className={`flex flex-col items-center gap-2 px-6 py-2 rounded-xl transition-all min-w-fit ${selectedCategories.length === 0
              ? 'text-primary-500 border-b-2 border-primary-500 font-bold bg-white/5'
              : 'text-muted hover:text-white'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">All Stays</span>
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`flex flex-col items-center gap-2 px-6 py-2 rounded-xl transition-all min-w-fit ${selectedCategories.includes(category.id)
                ? 'text-primary-500 border-b-2 border-primary-500 font-bold bg-white/5'
                : 'text-muted hover:text-white'
              }`}
            >
              {category.icon}
              <span className="text-xs font-bold uppercase tracking-wider">{category.label}</span>
            </button>
          ))}
        </div>

        {!isCollapsed && (
          <>
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary-500/5 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2" />

            {/* Search Inputs */}
            <div className="relative space-y-8 min-w-0 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 lg:gap-5 items-end w-full min-w-0">
                  {/* Where to? - Location Input */}
                  <div className="space-y-3 min-w-0" ref={locationDropdownRef}>
                    <label className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">Location</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLocationDropdown(!showLocationDropdown);
                          setShowDatePicker(false);
                          setShowGuestPicker(false);
                        }}
                        className="w-full h-14 flex items-center gap-4 px-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
                      >
                        <svg className="w-5 h-5 shrink-0 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-white font-medium truncate min-w-0">
                          {selectedLocation || 'City or area'}
                        </span>
                      </button>

                      {showLocationDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-4 bg-[#FAF3EA] backdrop-blur-xl rounded-2xl border border-[#51372B]/15 shadow-[0_20px_48px_rgba(81,55,43,0.18)] z-50 p-3 dark:bg-gray-900/95 dark:border-white/10 dark:shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                          <input
                            ref={locationInputRef}
                            type="text"
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            placeholder="City or area"
                            className="w-full px-4 py-3 bg-[#FFF8F0] border border-[#51372B]/15 rounded-xl text-[#51372B] placeholder-[#6B5346] focus:outline-none focus:ring-2 focus:ring-[#193F25] mb-2 dark:bg-white/5 dark:border-white/5 dark:text-white dark:placeholder-white/20 dark:focus:ring-primary-500"
                            autoFocus
                          />
                          <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-hide">
                            {displayLocations.length > 0 ? (
                              displayLocations.map((location) => (
                                <button
                                  key={location}
                                  type="button"
                                  onClick={() => handleLocationSelect(location)}
                                  className="w-full text-left px-4 py-3 text-[#51372B] hover:bg-[#193F25] hover:text-[#FAF3EA] rounded-xl transition-all font-medium dark:text-white dark:hover:bg-primary-500 dark:hover:text-black"
                                >
                                  {location}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-[#6B5346] text-sm italic dark:text-muted">No matching locations</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dates - Date Picker */}
                  <div className="space-y-3 min-w-0">
                    <label className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">Journey Dates</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDatePicker(!showDatePicker);
                          setShowLocationDropdown(false);
                          setShowGuestPicker(false);
                        }}
                        className="w-full h-14 flex items-center gap-4 px-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
                      >
                        <svg className="w-5 h-5 shrink-0 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-white font-medium truncate min-w-0">
                          {checkIn && checkOut
                            ? `${formatCalendarDate(checkIn, { month: 'short', day: 'numeric' })} - ${formatCalendarDate(checkOut, { month: 'short', day: 'numeric' })}`
                            : 'Choose when to wander'
                          }
                        </span>
                      </button>

                      {showDatePicker && (
                        <div className="absolute top-full left-0 right-0 mt-4 bg-[#FAF3EA] backdrop-blur-xl rounded-2xl border border-[#51372B]/15 shadow-[0_20px_48px_rgba(81,55,43,0.18)] z-50 p-4 sm:p-6 w-full min-w-0 max-w-[min(100vw-1.5rem,24rem)] sm:max-w-none sm:min-w-[320px] dark:bg-gray-900/95 dark:border-white/10 dark:shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                          <DateRangePicker
                            checkIn={checkIn}
                            checkOut={checkOut}
                            min={todayLocalYmd()}
                            onChange={(nextIn, nextOut) => {
                              setCheckIn(nextIn);
                              setCheckOut(nextOut);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(false)}
                            className="mt-4 w-full btn-primary !py-3"
                          >
                            Confirm Dates
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guests - Guest Picker */}
                  <div className="space-y-3 min-w-0">
                    <label className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">Travellers</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowGuestPicker(!showGuestPicker);
                          setShowLocationDropdown(false);
                          setShowDatePicker(false);
                        }}
                        className="w-full h-14 flex items-center gap-4 px-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
                      >
                        <svg className="w-5 h-5 shrink-0 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-white font-medium truncate min-w-0">
                          {guests + kids} {guests + kids === 1 ? 'Guest' : 'Guests'}
                          {pets > 0 && `, ${pets} ${pets === 1 ? 'Pet' : 'Pets'}`}
                        </span>
                      </button>

                      {showGuestPicker && (
                        <div className="absolute top-full left-0 right-0 mt-4 bg-[#FAF3EA] backdrop-blur-xl rounded-2xl border border-[#51372B]/15 shadow-[0_20px_48px_rgba(81,55,43,0.18)] z-50 p-4 sm:p-6 w-full min-w-0 max-w-[min(100vw-1.5rem,20rem)] lg:left-0 lg:right-auto lg:w-max lg:max-w-none lg:min-w-[280px] dark:bg-gray-900/95 dark:border-white/10 dark:shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                          <div className="space-y-6">
                            {/* Adults */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[#193F25] font-bold dark:text-white">Adults</span>
                                <p className="text-[#6B5346] text-xs dark:text-muted">Ages 13+</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => handleGuestChange(-1)}
                                  disabled={guests <= 1}
                                  className="w-10 h-10 rounded-xl border border-[#51372B]/25 bg-[#F4E6D4] text-[#193F25] hover:bg-[#ECD5BB] hover:border-[#193F25]/40 disabled:opacity-30 transition-all flex items-center justify-center font-bold dark:border-white/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/50"
                                >
                                  −
                                </button>
                                <span className="text-[#193F25] font-bold w-4 text-center dark:text-white">{guests}</span>
                                <button
                                  type="button"
                                  onClick={() => handleGuestChange(1)}
                                  className="w-10 h-10 rounded-xl border border-[#51372B]/25 bg-[#F4E6D4] text-[#193F25] hover:bg-[#ECD5BB] hover:border-[#193F25]/40 transition-all flex items-center justify-center font-bold dark:border-white/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/50"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Kids */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[#193F25] font-bold dark:text-white">Children</span>
                                <p className="text-[#6B5346] text-xs dark:text-muted">Ages 2-12</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => handleKidsChange(-1)}
                                  disabled={kids <= 0}
                                  className="w-10 h-10 rounded-xl border border-[#51372B]/25 bg-[#F4E6D4] text-[#193F25] hover:bg-[#ECD5BB] hover:border-[#193F25]/40 disabled:opacity-30 transition-all flex items-center justify-center font-bold dark:border-white/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/50"
                                >
                                  −
                                </button>
                                <span className="text-[#193F25] font-bold w-4 text-center dark:text-white">{kids}</span>
                                <button
                                  type="button"
                                  onClick={() => handleKidsChange(1)}
                                  className="w-10 h-10 rounded-xl border border-[#51372B]/25 bg-[#F4E6D4] text-[#193F25] hover:bg-[#ECD5BB] hover:border-[#193F25]/40 transition-all flex items-center justify-center font-bold dark:border-white/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/50"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Pets */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[#193F25] font-bold dark:text-white">Pets</span>
                                <p className="text-[#6B5346] text-xs dark:text-muted">Furry friends welcome</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => handlePetsChange(-1)}
                                  disabled={pets <= 0}
                                  className="w-10 h-10 rounded-xl border border-[#51372B]/25 bg-[#F4E6D4] text-[#193F25] hover:bg-[#ECD5BB] hover:border-[#193F25]/40 disabled:opacity-30 transition-all flex items-center justify-center font-bold dark:border-white/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/50"
                                >
                                  −
                                </button>
                                <span className="text-[#193F25] font-bold w-4 text-center dark:text-white">{pets}</span>
                                <button
                                  type="button"
                                  onClick={() => handlePetsChange(1)}
                                  className="w-10 h-10 rounded-xl border border-[#51372B]/25 bg-[#F4E6D4] text-[#193F25] hover:bg-[#ECD5BB] hover:border-[#193F25]/40 transition-all flex items-center justify-center font-bold dark:border-white/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/50"
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
                    className="btn-primary h-14 w-full lg:w-auto lg:shrink-0 !px-6 xl:!px-10 shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="font-bold">Search</span>
                    </div>
                  </button>
                </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

