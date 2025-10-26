'use client';

import Link from 'next/link';
import { Leaf, Smile, Sun, Heart, Sparkles, Wind } from 'lucide-react';

const categories = [
  {
    icon: Leaf,
    name: '420 Friendly',
    tag: '420_friendly',
    color: 'bg-green-100 text-green-700',
  },
  {
    icon: Sun,
    name: 'Yoga Spaces',
    tag: 'yoga_space',
    color: 'bg-orange-100 text-orange-700',
  },
  {
    icon: Sparkles,
    name: 'Meditation',
    tag: 'meditation_room',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    icon: Heart,
    name: 'Spa & Wellness',
    tag: 'spa_facilities',
    color: 'bg-pink-100 text-pink-700',
  },
  {
    icon: Smile,
    name: 'Smoke Free',
    tag: 'smoke_free',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    icon: Wind,
    name: 'Nature Retreat',
    tag: 'nature_retreat',
    color: 'bg-teal-100 text-teal-700',
  },
];

export function WellnessCategories() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Explore by Wellness Type
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => (
            <Link
              key={category.tag}
              href={`/search?tags=${category.tag}`}
              className="group"
            >
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-xl hover:shadow-lg transition-shadow">
                <div
                  className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <category.icon className="w-8 h-8" />
                </div>
                <span className="font-medium text-gray-900">
                  {category.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


