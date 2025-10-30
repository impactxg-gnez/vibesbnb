'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar as CalendarIcon, Users, Home, Plus, Minus } from 'lucide-react';
import { api } from '@/lib/api';

interface Listing {
  id: string;
  title: string;
  address: {
    city: string;
    state: string;
    country: string;
  };
}

interface Suggestion {
  type: 'location' | 'listing';
  value: string;
  display: string;
  listingId?: string;
  subtitle?: string;
}

export function SearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [listings, setListings] = useState<Listing[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch all listings for autocomplete
    fetchListings();

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchListings = async () => {
    try {
      const data = await api.get('/listings');
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  useEffect(() => {
    if (!location.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = location.toLowerCase();
    const newSuggestions: Suggestion[] = [];
    const locationSet = new Set<string>();

    // Find matching listings by title
    const matchingListings = listings.filter(
      (listing) => listing.title.toLowerCase().includes(query)
    );

    matchingListings.forEach((listing) => {
      newSuggestions.push({
        type: 'listing',
        value: listing.id,
        display: listing.title,
        listingId: listing.id,
        subtitle: `${listing.address.city}, ${listing.address.state}`,
      });
    });

    // Find matching locations (city, state)
    listings.forEach((listing) => {
      const city = listing.address.city.toLowerCase();
      const state = listing.address.state.toLowerCase();
      const locationKey = `${listing.address.city}, ${listing.address.state}`;

      if (
        (city.includes(query) || state.includes(query)) &&
        !locationSet.has(locationKey)
      ) {
        locationSet.add(locationKey);
        const count = listings.filter(
          (l) =>
            l.address.city === listing.address.city &&
            l.address.state === listing.address.state
        ).length;

        newSuggestions.push({
          type: 'location',
          value: locationKey,
          display: locationKey,
          subtitle: `${count} ${count === 1 ? 'property' : 'properties'}`,
        });
      }
    });

    setSuggestions(newSuggestions.slice(0, 8)); // Limit to 8 suggestions
    setShowSuggestions(newSuggestions.length > 0);
    setSelectedIndex(-1);
  }, [location, listings]);

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === 'listing') {
      // Navigate directly to the listing
      router.push(`/listings/${suggestion.listingId}`);
    } else {
      // Set location and trigger search
      setLocation(suggestion.value);
      setShowSuggestions(false);
      setTimeout(() => handleSearch(suggestion.value), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSearch = (searchLocation?: string) => {
    const params = new URLSearchParams();
    const loc = searchLocation || location;
    if (loc) params.set('location', loc);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests) params.set('guests', guests.toString());

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Location with Autocomplete */}
        <div className="relative" ref={wrapperRef}>
          <div className="flex items-center space-x-2 border border-gray-300 rounded-lg px-4 py-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Where to?"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => location && setShowSuggestions(true)}
              className="flex-1 outline-none"
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3 transition-colors ${
                    index === selectedIndex ? 'bg-gray-100' : ''
                  } ${index > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div className="mt-1">
                    {suggestion.type === 'listing' ? (
                      <Home className="w-5 h-5 text-primary-600" />
                    ) : (
                      <MapPin className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {suggestion.display}
                    </p>
                    {suggestion.subtitle && (
                      <p className="text-sm text-gray-500">{suggestion.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
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
          <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="flex items-center gap-3 flex-1 justify-between">
            <span className="text-gray-700 font-medium">
              {guests} {guests === 1 ? 'Guest' : 'Guests'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGuests(Math.max(1, guests - 1))}
                disabled={guests <= 1}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-600 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-current transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setGuests(guests + 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-600 hover:text-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => handleSearch()}
        className="btn-primary w-full mt-4 flex items-center justify-center space-x-2"
      >
        <Search className="w-5 h-5" />
        <span>Search</span>
      </button>
    </div>
  );
}


