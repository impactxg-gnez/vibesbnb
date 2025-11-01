'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type UserCategory = 'host' | 'traveller' | 'service_host' | 'dispensary';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const categories = [
  {
    id: 'host' as UserCategory,
    title: 'Host',
    description: 'List your 420-friendly property',
    icon: '🏠',
    color: 'from-green-500 to-green-600',
    hoverColor: 'hover:shadow-green-500/30',
  },
  {
    id: 'traveller' as UserCategory,
    title: 'Traveller',
    description: 'Find cannabis-friendly stays',
    icon: '✈️',
    color: 'from-blue-500 to-blue-600',
    hoverColor: 'hover:shadow-blue-500/30',
  },
  {
    id: 'service_host' as UserCategory,
    title: 'Service Host',
    description: 'Offer wellness services',
    icon: '🧘',
    color: 'from-purple-500 to-purple-600',
    hoverColor: 'hover:shadow-purple-500/30',
  },
  {
    id: 'dispensary' as UserCategory,
    title: 'Dispensary',
    description: 'Partner with travelers',
    icon: '🌿',
    color: 'from-yellow-500 to-yellow-600',
    hoverColor: 'hover:shadow-yellow-500/30',
  },
];

export default function ComingSoonPage() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const calculateTimeLeft = () => {
      // April 20, 2026 at 12:00 PM PST (UTC-8)
      // Converting to UTC: 12 PM PST = 8 PM UTC
      const launchDate = new Date('2026-04-20T20:00:00Z');
      const now = new Date();
      const difference = launchDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Logo */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/50">
              <span className="text-white font-bold text-4xl">V</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              VibesBNB
            </h1>
          </div>
        </div>

        {/* Coming Soon Badge */}
        <div className="mb-8 animate-fade-in-up">
          <div className="inline-block px-6 py-2 bg-green-500/20 border border-green-500/50 rounded-full">
            <span className="text-green-400 font-semibold text-sm uppercase tracking-wider">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Main Heading */}
        <div className="text-center mb-12 max-w-4xl animate-fade-in-up delay-200">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            The Future of{' '}
            <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              420-Friendly Travel
            </span>
            {' '}Is Almost Here
          </h2>
          <p className="text-lg md:text-xl text-gray-300 mb-4">
            Sign up for early access and be the first to experience a new way to travel
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="mb-16 animate-fade-in-up delay-300">
          <div className="flex gap-4 md:gap-8">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds },
            ].map((item, index) => (
              <div key={item.label} className="flex flex-col items-center">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 md:p-6 min-w-[80px] md:min-w-[120px] shadow-xl">
                  <div className="text-4xl md:text-6xl font-bold bg-gradient-to-br from-green-400 to-green-600 bg-clip-text text-transparent">
                    {String(item.value).padStart(2, '0')}
                  </div>
                </div>
                <div className="text-gray-400 text-sm md:text-base mt-2 uppercase tracking-wider">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Launch Date */}
        <div className="mb-12 text-center animate-fade-in-up delay-400">
          <p className="text-gray-400 text-lg">
            Launching on{' '}
            <span className="text-green-400 font-semibold">
              April 20, 2026 at 12:00 PM PST
            </span>
          </p>
        </div>

        {/* Category Cards */}
        <div className="mb-12 max-w-5xl w-full animate-fade-in-up delay-500">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Get Early Access
          </h3>
          <p className="text-center text-gray-400 mb-8">
            Choose your category and be among the first to join when we launch
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/early-access?category=${category.id}`}
                className={`group bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${category.hoverColor}`}
              >
                <div className="text-5xl mb-4">{category.icon}</div>
                <h4 className="text-xl font-semibold mb-2">{category.title}</h4>
                <p className="text-gray-400 text-sm mb-4">{category.description}</p>
                <div className={`inline-flex items-center text-sm font-semibold bg-gradient-to-r ${category.color} bg-clip-text text-transparent group-hover:gap-2 transition-all`}>
                  <span>Sign up</span>
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm animate-fade-in-up delay-600">
          <p>© 2025 VibesBNB. All rights reserved.</p>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 1s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 1s ease-out; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-600 { animation-delay: 600ms; }
        .delay-1000 { animation-delay: 1000ms; }
      `}</style>
    </div>
  );
}

