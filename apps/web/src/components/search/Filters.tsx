'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Minus, Home, Building, Hotel, Warehouse, Wind, Wifi, Droplets, Tv, Shirt, Thermometer } from 'lucide-react';

interface FiltersProps {
  onApply: (filters: any) => void;
  onClose: () => void;
  initialFilters?: any;
}

export default function Filters({ onApply, onClose, initialFilters }: FiltersProps) {
  const [typeOfPlace, setTypeOfPlace] = useState(initialFilters?.typeOfPlace || 'any');
  const [priceRange, setPriceRange] = useState(initialFilters?.priceRange || [0, 100000]);
  const [minPrice, setMinPrice] = useState(initialFilters?.priceRange?.[0] || 0);
  const [maxPrice, setMaxPrice] = useState(initialFilters?.priceRange?.[1] || 100000);
  
  const [rooms, setRooms] = useState(initialFilters?.rooms || 0);
  const [beds, setBeds] = useState(initialFilters?.beds || 0);
  const [bathrooms, setBathrooms] = useState(initialFilters?.bathrooms || 0);
  
  const [propertyTypes, setPropertyTypes] = useState<string[]>(initialFilters?.propertyTypes || []);
  const [amenities, setAmenities] = useState<string[]>(initialFilters?.amenities || []);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const availablePropertyTypes = [
    { id: 'House', label: 'House', icon: <Home size={20} /> },
    { id: 'Apartment', label: 'Apartment', icon: <Building size={20} /> },
    { id: 'Guest house', label: 'Guest house', icon: <Warehouse size={20} /> },
    { id: 'Hotel', label: 'Hotel', icon: <Hotel size={20} /> },
  ];

  const allAmenities = [
    { id: 'Air conditioning', label: 'Air conditioning', icon: <Wind size={18} /> },
    { id: 'Wifi', label: 'Wifi', icon: <Wifi size={18} /> },
    { id: 'Pool', icon: <Droplets size={18} />, label: 'Pool' },
    { id: 'Kitchen', label: 'Kitchen', icon: <Warehouse size={18} /> },
    { id: 'TV', label: 'TV', icon: <Tv size={18} /> },
    { id: 'Washer', label: 'Washer', icon: <Shirt size={18} /> },
    { id: 'Iron', label: 'Iron', icon: <Thermometer size={18} /> },
    { id: 'Hairdryer', label: 'Hairdryer', icon: <Wind size={18} /> },
  ];

  const togglePropertyType = (type: string) => {
    setPropertyTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleApply = () => {
    onApply({
      typeOfPlace,
      priceRange: [minPrice, maxPrice],
      rooms,
      beds,
      bathrooms,
      propertyTypes,
      amenities
    });
  };

  const handleReset = () => {
    setTypeOfPlace('any');
    setMinPrice(0);
    setMaxPrice(100000);
    setRooms(0);
    setBeds(0);
    setBathrooms(0);
    setPropertyTypes([]);
    setAmenities([]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition">
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold">Filters</h2>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
        {/* Type of place */}
        <section>
          <h3 className="text-lg font-bold mb-4">Type of place</h3>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            {['any', 'room', 'entire'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeOfPlace(type)}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                  typeOfPlace === type 
                    ? 'bg-primary-500 text-black shadow-lg' 
                    : 'text-muted hover:text-white'
                }`}
              >
                {type === 'any' ? 'Any type' : type === 'room' ? 'Room' : 'Entire home'}
              </button>
            ))}
          </div>
        </section>

        {/* Price range */}
        <section>
          <h3 className="text-lg font-bold mb-1">Price range</h3>
          <p className="text-muted text-sm mb-6">Trip price, includes all fees</p>
          
          {/* Histogram placeholder */}
          <div className="relative h-20 flex items-end justify-between gap-1 mb-6 px-2">
            {[4, 6, 8, 12, 10, 15, 20, 25, 30, 28, 35, 40, 38, 45, 42, 35, 25, 20, 18, 15, 12, 10, 8, 6, 4, 3, 2, 3, 4, 3].map((height, i) => (
              <div 
                key={i} 
                className={`flex-1 rounded-t-sm transition-colors ${
                  (i / 30) * 100000 >= minPrice && (i / 30) * 100000 <= maxPrice 
                    ? 'bg-primary-500' 
                    : 'bg-white/10'
                }`} 
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-xs text-muted uppercase font-bold ml-1">Minimum</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">₹</span>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-8 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                />
              </div>
            </div>
            <div className="w-4 h-[1px] bg-white/20 mt-8"></div>
            <div className="flex-1 space-y-2">
              <label className="text-xs text-muted uppercase font-bold ml-1">Maximum</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">₹</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-8 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Rooms and beds */}
        <section>
          <h3 className="text-lg font-bold mb-6">Rooms and beds</h3>
          <div className="space-y-6">
            {[
              { id: 'rooms', label: 'Bedrooms', value: rooms, setValue: setRooms },
              { id: 'beds', label: 'Beds', value: beds, setValue: setBeds },
              { id: 'bathrooms', label: 'Bathrooms', value: bathrooms, setValue: setBathrooms },
            ].map((field) => (
              <div key={field.id} className="flex items-center justify-between">
                <span className="text-white font-medium">{field.label}</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => field.setValue(Math.max(0, field.value - 1))}
                    disabled={field.value === 0}
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 disabled:opacity-30 transition"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-white font-bold w-6 text-center">
                    {field.value === 0 ? 'Any' : field.value}
                  </span>
                  <button
                    onClick={() => field.setValue(field.value + 1)}
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Property type */}
        <section>
          <h3 className="text-lg font-bold mb-6">Property type</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {availablePropertyTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => togglePropertyType(type.id)}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                  propertyTypes.includes(type.id)
                    ? 'bg-primary-500 border-primary-500 text-black shadow-lg scale-105 font-bold'
                    : 'bg-white/5 border-white/10 text-muted hover:border-white/30 hover:text-white'
                }`}
              >
                {type.icon}
                <span className="text-sm font-bold">{type.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Amenities */}
        <section>
          <h3 className="text-lg font-bold mb-6">Amenities</h3>
          <div className="grid grid-cols-2 gap-4">
            {(showAllAmenities ? allAmenities : allAmenities.slice(0, 6)).map((amenity) => (
              <button
                key={amenity.id}
                onClick={() => toggleAmenity(amenity.id)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all ${
                  amenities.includes(amenity.id)
                    ? 'bg-primary-500 border-primary-500 text-black shadow-lg font-bold'
                    : 'bg-white/5 border-white/10 text-muted hover:border-white/30 hover:text-white'
                }`}
              >
                <div className={amenities.includes(amenity.id) ? 'text-black' : 'text-primary-500'}>
                  {amenity.icon}
                </div>
                <span className="text-sm font-bold">{amenity.label}</span>
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAllAmenities(!showAllAmenities)}
            className="mt-6 text-primary-500 font-bold flex items-center gap-2 hover:underline"
          >
            {showAllAmenities ? 'Show less' : 'Show more'}
            <svg className={`w-4 h-4 transition-transform ${showAllAmenities ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </section>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-white/10 flex items-center justify-between bg-surface-dark">
        <button 
          onClick={handleReset}
          className="text-white font-bold hover:underline"
        >
          Clear all
        </button>
        <button 
          onClick={handleApply}
          className="btn-primary !px-10 font-black shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
        >
          Show relevant properties
        </button>
      </div>
    </div>
  );
}
