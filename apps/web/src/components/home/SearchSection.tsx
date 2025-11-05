'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export function SearchSection() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = [
    { id: 'spa', label: 'Spa', icon: '💆' },
    { id: 'yoga', label: 'Yoga', icon: '🧘' },
    { id: 'cabins', label: 'Cabins', icon: '🏡' },
  ];

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="container mx-auto px-4 -mt-16 relative z-10 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800"
      >
        {/* Search Inputs */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
            <button className="flex items-center gap-2 px-4 py-3 bg-gray-800 rounded-2xl text-left hover:bg-gray-750 transition">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white">Where to?</span>
            </button>
            
            <button className="flex items-center gap-2 px-4 py-3 bg-gray-800 rounded-2xl text-left hover:bg-gray-750 transition">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-white">Dates</span>
            </button>
            
            <button className="flex items-center gap-2 px-4 py-3 bg-gray-800 rounded-2xl text-left hover:bg-gray-750 transition">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-white">Guests</span>
            </button>
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
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-750'
              }`}
            >
              <span>{category.icon}</span>
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          ))}
        </div>

        {/* Search Button */}
        <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-gray-900 font-semibold py-4 rounded-2xl transition">
          Search stays
        </button>
      </motion.div>
    </div>
  );
}

