'use client';

import { Search, Calendar, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

const steps = [
  {
    icon: Search,
    title: 'Search & Discover',
    description:
      'Browse wellness-focused properties filtered by your preferences',
  },
  {
    icon: Calendar,
    title: 'Book Securely',
    description: 'Easy booking with secure payments and instant confirmation',
  },
  {
    icon: Home,
    title: 'Enjoy Your Stay',
    description: 'Relax at verified, welcoming properties tailored to you',
  },
];

export function HowItWorks() {
  const router = useRouter();

  const handleStartExploring = () => {
    // Navigate to search page to show all available properties
    router.push('/search');
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button 
            onClick={handleStartExploring}
            className="btn-primary"
          >
            Start Exploring
          </button>
        </div>
      </div>
    </section>
  );
}


