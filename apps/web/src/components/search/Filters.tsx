'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Home,
  Building,
  Warehouse,
  Wind,
  Wifi,
  Droplets,
  Tv,
  Shirt,
  Car,
  Dumbbell,
  Flame,
  Waves,
  Briefcase,
  Footprints,
  Bed,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface PriceDistribution {
  min: number;
  max: number;
  buckets: number[];
}

interface FiltersProps {
  onApply: (filters: any) => void;
  onClose: () => void;
  initialFilters?: any;
  priceDistribution: PriceDistribution;
  onPriceRangeLive?: (min: number, max: number) => void;
}

function fmtPrice(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export default function Filters({
  onApply,
  onClose,
  initialFilters,
  priceDistribution,
  onPriceRangeLive,
}: FiltersProps) {
  const floor = priceDistribution.min;
  const ceil = priceDistribution.max;
  const buckets = priceDistribution.buckets;
  const binCount = Math.max(buckets.length, 1);
  /** Slider / filter range uses $0 … catalog max so the default includes all nightly rates. */
  const sliderSpan = Math.max(ceil, 1);

  const [minPrice, setMinPrice] = useState(() => initialFilters?.priceRange?.[0] ?? 0);
  const [maxPrice, setMaxPrice] = useState(() => initialFilters?.priceRange?.[1] ?? ceil);

  const [rooms, setRooms] = useState(initialFilters?.rooms || 0);
  const [beds, setBeds] = useState(initialFilters?.beds || 0);
  const [bathrooms, setBathrooms] = useState(initialFilters?.bathrooms || 0);

  const [propertyTypes, setPropertyTypes] = useState<string[]>(initialFilters?.propertyTypes || []);
  const [amenities, setAmenities] = useState<string[]>(initialFilters?.amenities || []);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [hoverBar, setHoverBar] = useState<number | null>(null);

  useEffect(() => {
    const r = initialFilters?.priceRange;
    if (!r) return;
    const lo = Math.max(0, Math.min(ceil, r[0]));
    const hi = Math.max(0, Math.min(ceil, r[1]));
    setMinPrice(Math.min(lo, hi));
    setMaxPrice(Math.max(lo, hi));
  }, [floor, ceil, initialFilters?.priceRange?.[0], initialFilters?.priceRange?.[1]]);

  const clamp = (n: number) =>
    Math.max(0, Math.min(ceil, Math.round(Number.isFinite(n) ? n : 0)));

  const emitLive = (lo: number, hi: number) => {
    if (!onPriceRangeLive) return;
    const a = clamp(Math.min(lo, hi));
    const b = clamp(Math.max(lo, hi));
    onPriceRangeLive(a, b);
  };

  const span = Math.max(ceil - floor, 1);
  const maxBucket = Math.max(...buckets, 1);

  const bucketBoundaries = (i: number) => {
    const bLo = floor + (i / binCount) * span;
    const bHi = i === binCount - 1 ? ceil : floor + ((i + 1) / binCount) * span;
    return { bLo, bHi };
  };

  const barOverlapsSelection = (i: number) => {
    const { bLo, bHi } = bucketBoundaries(i);
    return !(bHi < minPrice || bLo > maxPrice);
  };

  const availablePropertyTypes = [
    { id: 'Entire House', label: 'Entire House', icon: <Home size={20} /> },
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
    setPropertyTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleApply = () => {
    const lo = clamp(Math.min(minPrice, maxPrice));
    const hi = clamp(Math.max(minPrice, maxPrice));
    onApply({
      priceRange: [lo, hi],
      rooms,
      beds,
      bathrooms,
      propertyTypes,
      amenities,
    });
  };

  const handleReset = () => {
    setMinPrice(0);
    setMaxPrice(ceil);
    setRooms(0);
    setBeds(0);
    setBathrooms(0);
    setPropertyTypes([]);
    setAmenities([]);
    onPriceRangeLive?.(0, ceil);
  };

  const leftPct = (minPrice / sliderSpan) * 100;
  const rightPct = 100 - (maxPrice / sliderSpan) * 100;

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between p-6 border-b border-white/10 glass-morphism sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-black tracking-tight uppercase">Refine Selection</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-12 scrollbar-hide">
        <section>
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
            Price range
          </h3>
          <p className="text-muted text-sm mb-12 font-medium">
            Nightly rates (per night) for properties matching your search — min {fmtPrice(floor)}, max{' '}
            {fmtPrice(ceil)}.
          </p>

          <div className="relative pt-12 pb-8 px-1">
            <div className="relative h-24 flex items-end justify-between gap-[2px] mb-[-1px]">
              {buckets.map((count, i) => {
                const { bLo, bHi } = bucketBoundaries(i);
                const pct = 6 + (count / maxBucket) * 94;
                const active = barOverlapsSelection(i);
                const loR = Math.round(bLo);
                const hiR = Math.round(bHi);
                const rangeLabel =
                  loR === hiR ? fmtPrice(loR) : `${fmtPrice(bLo)}–${fmtPrice(bHi)}`;
                return (
                  <div
                    key={i}
                    className="relative flex-1 flex flex-col items-center justify-end h-full"
                    onMouseEnter={() => setHoverBar(i)}
                    onMouseLeave={() => setHoverBar(null)}
                  >
                    {hoverBar === i && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20 whitespace-nowrap rounded-lg bg-gray-900 border border-white/15 px-2 py-1 text-[10px] font-bold text-white shadow-xl pointer-events-none">
                        <span className="text-rose-300">{rangeLabel}</span>
                        <span className="text-muted"> · {count} stay{count === 1 ? '' : 's'}</span>
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t-[2px] transition-all duration-200 cursor-pointer ${
                        active ? 'bg-rose-500' : 'bg-white/10 opacity-40 hover:opacity-70'
                      }`}
                      style={{ height: `${pct}%` }}
                      title={`${rangeLabel} · ${count} properties`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="relative h-2 w-full bg-white/10 rounded-full mt-[-1px]">
              <div
                className="absolute h-full bg-rose-500 rounded-full"
                style={{
                  left: `${Math.min(100, Math.max(0, leftPct))}%`,
                  right: `${Math.min(100, Math.max(0, rightPct))}%`,
                }}
              />

              <input
                type="range"
                min={0}
                max={ceil}
                step={1}
                value={minPrice}
                onChange={(e) => {
                  const v = clamp(Number(e.target.value));
                  const next = Math.min(v, maxPrice - 1);
                  setMinPrice(next);
                  emitLive(next, maxPrice);
                }}
                className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none h-2 range-thumb-custom"
              />
              <input
                type="range"
                min={0}
                max={ceil}
                step={1}
                value={maxPrice}
                onChange={(e) => {
                  const v = clamp(Number(e.target.value));
                  const next = Math.max(v, minPrice + 1);
                  setMaxPrice(next);
                  emitLive(minPrice, next);
                }}
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
                box-shadow:
                  0 4px 6px -1px rgb(0 0 0 / 0.1),
                  0 2px 4px -2px rgb(0 0 0 / 0.1);
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
                box-shadow:
                  0 4px 6px -1px rgb(0 0 0 / 0.1),
                  0 2px 4px -2px rgb(0 0 0 / 0.1);
              }
            `}</style>
          </div>

          <div className="flex items-center justify-between gap-6 pt-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] text-muted uppercase font-black tracking-widest ml-1">
                Minimum
              </label>
              <div className="relative group p-4 border border-white/10 rounded-full bg-white/5 flex items-baseline gap-1 focus-within:ring-2 focus-within:ring-rose-500/50 transition-all">
                <span className="text-white font-bold opacity-50">$</span>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') return;
                    const v = clamp(Number(raw));
                    const next = Math.min(v, maxPrice - 1);
                    setMinPrice(next);
                    emitLive(next, maxPrice);
                  }}
                  className="w-full bg-transparent text-white font-black text-lg focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 space-y-2 text-right">
              <label className="text-[10px] text-muted uppercase font-black tracking-widest mr-1">
                Maximum
              </label>
              <div className="relative group p-4 border border-white/10 rounded-full bg-white/5 flex items-baseline gap-1 focus-within:ring-2 focus-within:ring-rose-500/50 transition-all">
                <span className="text-white font-bold opacity-50 ml-auto">$</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') return;
                    const v = clamp(Number(raw));
                    const next = Math.max(v, minPrice + 1);
                    setMaxPrice(next);
                    emitLive(minPrice, next);
                  }}
                  className="w-full bg-transparent text-white font-black text-lg focus:outline-none text-right"
                />
              </div>
            </div>
          </div>
        </section>

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
                <div
                  className={`p-4 rounded-2xl ${
                    propertyTypes.includes(type.id)
                      ? 'bg-primary-500 text-black'
                      : 'bg-white/10 text-primary-500'
                  }`}
                >
                  {type.icon}
                </div>
                <span className="text-xs font-black uppercase tracking-wider">{type.label}</span>
              </button>
            ))}
          </div>
        </section>

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
                  <span className="text-white font-bold text-lg group-hover:text-primary-500 transition-colors">
                    {field.label}
                  </span>
                  <p className="text-[10px] text-muted uppercase tracking-widest font-black mt-0.5">
                    Min required
                  </p>
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
                  <div
                    className={
                      amenities.includes(amenity.id)
                        ? 'text-primary-500 scale-110'
                        : 'text-primary-500/60'
                    }
                  >
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
            <svg
              className={`w-5 h-5 transition-transform duration-700 ${
                showAllAmenities ? 'rotate-180' : 'group-hover:translate-y-0.5'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </section>
      </div>

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
