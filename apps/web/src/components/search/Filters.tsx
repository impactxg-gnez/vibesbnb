'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Minus, Home, Building, Hotel, Warehouse, Wind, Wifi, 
  Droplets, Tv, Shirt, Thermometer, Car, Dumbbell, Flame, 
  Waves, Briefcase, Footprints, Bed, Bath, Search
} from 'lucide-react';
import { motion } from 'framer-motion';

interface FiltersProps {
  onApply: (filters: any) => void;
  onClose: () => void;
  initialFilters?: any;
}

export default function Filters({ onApply, onClose, initialFilters }: FiltersProps) {
  const [typeOfPlace, setTypeOfPlace] = useState(initialFilters?.typeOfPlace || 'any');
  const [minPrice, setMinPrice] = useState(initialFilters?.priceRange?.[0] || 0);
  const [maxPrice, setMaxPrice] = useState(initialFilters?.priceRange?.[1] || 100000);
  
  const [rooms, setRooms] = useState(initialFilters?.rooms || 0);
  const [beds, setBeds] = useState(initialFilters?.beds || 0);
  const [bathrooms, setBathrooms] = useState(initialFilters?.bathrooms || 0);
  
  const [propertyTypes, setPropertyTypes] = useState<string[]>(initialFilters?.propertyTypes || []);
  const [amenities, setAmenities] = useState<string[]>(initialFilters?.amenities || []);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const priceLimit = 100000;

  const availablePropertyTypes = [
    { id: 'Entire House', label: 'House', icon: <Home size={20} /> },
    { id: 'Apartment', label: 'Apartment', icon: <Building size={20} /> },
    { id: 'Condo', label: 'Condo', icon: <Building size={20} /> },
    { id: 'Private Rooms', label: 'Private Room', icon: <Bed size={20} /> },
    { id: 'Room inside property', label: 'Shared Room', icon: <Bed size={20} /> },
  ];

  const allAmenities = [
    { id: 'WiFi', label: 'WiFi', icon: <Wifi size={18} /> },
    { id: 'Kitchen', label: 'Kitchen', icon: <Warehouse size={18} /> },
    { id: 'Parking', label: 'Parking', icon: <Car size={18} /> },
    { id: 'Pool', label: 'Pool', icon: <Droplets size={18} /> },
    { id: 'Hot Tub', label: 'Hot Tub', icon: <Waves size={18} /> },
    { id: 'Gym', label: 'Gym', icon: <Dumbbell size={18} /> },
    { id: 'Air Conditioning', label: 'Air Conditioning', icon: <Wind size={18} /> },
    { id: 'Heating', label: 'Heating', icon: <Flame size={18} /> },
    { id: 'TV', label: 'TV', icon: <Tv size={18} /> },
    { id: 'Washer/Dryer', label: 'Washer/Dryer', icon: <Shirt size={18} /> },
    { id: 'Pet Friendly', label: 'Pet Friendly', icon: <Footprints size={18} /> },
    { id: 'Workspace', label: 'Workspace', icon: <Briefcase size={18} /> },
    { id: 'Fireplace', label: 'Fireplace', icon: <Flame size={18} /> },
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
    setMaxPrice(priceLimit);
    setRooms(0);
    setBeds(0);
    setBathrooms(0);
    setPropertyTypes([]);
    setAmenities([]);
  };

  // Realistic histogram heights for price range (as per the User provided image)
  const histogramData = [
    10, 15, 12, 18, 25, 45, 120, 150, 180, 200, 220, 230, 250, 260, 240, 220, 180, 140, 120, 100, 
    80, 70, 60, 50, 40, 35, 30, 25, 20, 18, 15, 12, 10, 8, 6, 4, 3, 2, 1, 1
  ];

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 glass-morphism sticky top-0 z-10">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90">
          <X size={24} />
        </button>
        <h2 className="text-xl font-black tracking-tight uppercase">Refine Selection</h2>
        <div className="w-10"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-12 scrollbar-hide">
        {/* Type of place */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
              Type of place
            </h3>
          </div>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {[
              { id: 'any', label: 'Any type' },
              { id: 'room', label: 'Room' },
              { id: 'entire', label: 'Entire home' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setTypeOfPlace(type.id)}
                className={`flex-1 py-4 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                  typeOfPlace === type.id 
                    ? 'bg-primary-500 text-black shadow-[0_0_20px_rgba(0,230,118,0.3)]' 
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </section>

        {/* Price range */}
        <section>
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
            Price range
          </h3>
          <p className="text-muted text-sm mb-12 font-medium">Nightly rates, including all service fees.</p>
          
          <div className="relative pt-10 pb-8 px-4">
            {/* Histogram Visualiser */}
            <div className="relative h-20 flex items-end justify-between gap-[2px] mb-[-1px] group">
              {histogramData.map((height, i) => {
                const barPrice = (i / histogramData.length) * priceLimit;
                const isActive = barPrice >= minPrice && barPrice <= maxPrice;
                return (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-t-[1px] transition-all duration-300 ${
                      isActive 
                        ? 'bg-rose-500' 
                        : 'bg-white/10 opacity-30'
                    }`} 
                    style={{ height: `${(height / 260) * 100}%` }}
                  ></div>
                );
              })}
            </div>

            {/* Slider Thumbs */}
            <div className="relative h-2 w-full bg-white/10 rounded-full mt-[-1px]">
              {/* Active track */}
              <div 
                className="absolute h-full bg-rose-500 rounded-full"
                style={{
                  left: `${(minPrice / priceLimit) * 100}%`,
                  right: `${100 - (maxPrice / priceLimit) * 100}%`
                }}
              />
              
              {/* Thumbs */}
              <input
                type="range"
                min="0"
                max={priceLimit}
                value={minPrice}
                onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 500))}
                className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none h-2 range-thumb-custom"
              />
              <input
                type="range"
                min="0"
                max={priceLimit}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 500))}
                className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none h-2 range-thumb-custom"
              />
            </div>
            
            <style jsx>{`
              .range-thumb-custom::-webkit-slider-thumb {
                appearance: none;
                pointer-events: auto;
                width: 32px;
                height: 32px;
                border-radius: 9999px;
                background: white;
                border: 1px solid #e5e7eb;
                cursor: pointer;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
              }
              .range-thumb-custom::-moz-range-thumb {
                appearance: none;
                pointer-events: auto;
                width: 32px;
                height: 32px;
                border-radius: 9999px;
                background: white;
                border: 1px solid #e5e7eb;
                cursor: pointer;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
              }
            `}</style>
          </div>

          <div className="flex items-center justify-between gap-6 pt-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] text-muted uppercase font-black tracking-widest ml-1">Minimum</label>
              <div className="relative group p-4 border border-white/10 rounded-full bg-white/5 flex items-baseline gap-1 focus-within:ring-2 focus-within:ring-rose-500/50 transition-all">
                <span className="text-white font-bold opacity-50">₹</span>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-black text-lg focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 space-y-2 text-right">
              <label className="text-[10px] text-muted uppercase font-black tracking-widest mr-1">Maximum</label>
              <div className="relative group p-4 border border-white/10 rounded-full bg-white/5 flex items-baseline gap-1 focus-within:ring-2 focus-within:ring-rose-500/50 transition-all">
                <span className="text-white font-bold opacity-50 ml-auto">₹</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-black text-lg focus:outline-none text-right"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Property type */}
        <section>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
            Property type
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePropertyTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => togglePropertyType(type.id)}
                className={`flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all duration-500 ${
                  propertyTypes.includes(type.id)
                    ? 'bg-primary-500/10 border-primary-500 text-white shadow-[0_15px_40px_rgba(0,230,118,0.2)] ring-1 ring-primary-500 scale-[1.02]'
                    : 'bg-white/5 border-white/5 text-muted hover:border-white/20 hover:text-white'
                }`}
              >
                <div className={`p-4 rounded-2xl ${propertyTypes.includes(type.id) ? 'bg-primary-500 text-black' : 'bg-white/10 text-primary-500'}`}>
                  {type.icon}
                </div>
                <span className="text-xs font-black uppercase tracking-wider">{type.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Rooms and beds */}
        <section>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
            Rooms and beds
          </h3>
          <div className="grid gap-6 bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-inner">
            {[
              { id: 'rooms', label: 'Bedrooms', value: rooms, setValue: setRooms },
              { id: 'beds', label: 'Beds', value: beds, setValue: setBeds },
              { id: 'bathrooms', label: 'Bathrooms', value: bathrooms, setValue: setBathrooms },
            ].map((field) => (
              <div key={field.id} className="flex items-center justify-between group">
                <div>
                  <span className="text-white font-bold text-lg group-hover:text-primary-500 transition-colors">{field.label}</span>
                  <p className="text-[10px] text-muted uppercase tracking-widest font-black mt-0.5">Min required</p>
                </div>
                <div className="flex items-center gap-4 bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-lg">
                  <button
                    onClick={() => field.setValue(Math.max(0, field.value - 1))}
                    disabled={field.value === 0}
                    className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 disabled:opacity-20 transition-all active:scale-90"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-white font-black text-xl w-8 text-center tabular-nums">
                    {field.value === 0 ? 'Any' : field.value}
                  </span>
                  <button
                    onClick={() => field.setValue(field.value + 1)}
                    className="w-12 h-12 rounded-xl bg-primary-500 text-black flex items-center justify-center hover:bg-primary-400 hover:shadow-primary-500/25 transition-all active:scale-90 shadow-lg"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Amenities */}
        <section>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
            Property Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(showAllAmenities ? allAmenities : allAmenities.slice(0, 8)).map((amenity) => (
              <button
                key={amenity.id}
                onClick={() => toggleAmenity(amenity.id)}
                className={`flex items-center justify-between px-6 py-5 rounded-3xl border transition-all duration-500 ${
                  amenities.includes(amenity.id)
                    ? 'bg-primary-500/10 border-primary-500 text-white font-black shadow-[0_10px_30px_rgba(0,230,118,0.1)]'
                    : 'bg-white/5 border-white/5 text-muted hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={amenities.includes(amenity.id) ? 'text-primary-500 scale-110' : 'text-primary-500/60'}>
                    {amenity.icon}
                  </div>
                  <span className="text-sm font-bold">{amenity.label}</span>
                </div>
                {amenities.includes(amenity.id) && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAllAmenities(!showAllAmenities)}
            className="mt-8 mx-auto btn-secondary !px-10 !py-4 rounded-2xl flex items-center gap-3 hover:bg-white/10 group transition-all"
          >
            {showAllAmenities ? 'Show less' : 'Explore all features'}
            <svg className={`w-5 h-5 transition-transform duration-700 ${showAllAmenities ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </section>
      </div>

      {/* Footer */}
      <div className="p-10 border-t border-white/10 flex items-center justify-between glass-morphism backdrop-blur-3xl sticky bottom-0 z-10">
        <button 
          onClick={handleReset}
          className="text-white/40 font-black tracking-widest text-[10px] uppercase hover:text-white transition-all underline decoration-white/20 decoration-2 underline-offset-8"
        >
          Reset All
        </button>
        <button 
          onClick={handleApply}
          className="btn-primary !px-16 !py-6 font-black text-lg uppercase tracking-tight shadow-[0_25px_50px_rgba(0,230,118,0.3)] hover:scale-105 active:scale-95 flex items-center gap-4 rounded-[2rem]"
        >
          <Search size={24} strokeWidth={3} />
          View Properties
        </button>
      </div>
    </div>
  );
}
