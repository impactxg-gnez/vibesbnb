'use client';

import Link from 'next/link';

const categories = [
  {
    name: 'Wellness Retreats',
    description: 'Relax and rejuvenate',
    icon: '🧘',
    href: '/search?category=wellness',
  },
  {
    name: 'Adventure Stays',
    description: 'Explore the outdoors',
    icon: '🏔️',
    href: '/search?category=adventure',
  },
  {
    name: 'City Escapes',
    description: 'Urban experiences',
    icon: '🌆',
    href: '/search?category=city',
  },
  {
    name: 'Beach Vibes',
    description: 'Coastal relaxation',
    icon: '🏖️',
    href: '/search?category=beach',
  },
  {
    name: 'Mountain Getaways',
    description: 'Elevated experiences',
    icon: '⛰️',
    href: '/search?category=mountain',
  },
  {
    name: 'Unique Spaces',
    description: 'One-of-a-kind stays',
    icon: '✨',
    href: '/search?category=unique',
  },
];

export function WellnessCategories() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Explore By Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link
            key={category.name}
            href={category.href}
            className="group p-6 border border-gray-200 rounded-xl hover:border-green-600 hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">{category.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-green-600">
              {category.name}
            </h3>
            <p className="text-sm text-gray-600">{category.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

