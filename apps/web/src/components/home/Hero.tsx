'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Hero() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [guests, setGuests] = useState(2);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (guests) params.set('guests', guests.toString());
    router.push(`/search?${params.toString()}`);
  };

  // Hero background image URL from Supabase Storage
  // Can be overridden with NEXT_PUBLIC_HERO_BACKGROUND_URL environment variable
  const backgroundImageUrl = process.env.NEXT_PUBLIC_HERO_BACKGROUND_URL ||
    'https://okmudgacbpgycixtpoqx.supabase.co/storage/v1/object/public/hero-images/a7af8f52-573a-49db-a8a8-ee3cb49cbe69.jfif';

  return (
    <div className="relative h-[600px] md:h-[700px] overflow-hidden">
      <img
        src={backgroundImageUrl}
        alt="VibesBNB Hero"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-surface-dark/40 via-transparent to-surface-dark" />

      <div className="relative container mx-auto px-6 h-full flex flex-col justify-center pb-20 sm:pb-12 md:pb-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >


          <h1 className="text-6xl md:text-7xl font-bold text-white mb-12 tracking-tight leading-tight">
            Find your <br />
            <span className="text-primary-500">cannabis-friendly</span> <br />
            sanctuary
          </h1>

          {/* Minimal Search Bar */}


          <div className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 relative z-40">
            <button
              onClick={() => handleSearch()}
              className="bg-primary-500 text-black px-6 sm:px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-primary-400 transition-all shadow-[0_0_30px_rgba(0,230,118,0.3)] group"
            >
              <span className="text-xl group-hover:rotate-12 transition-transform">🌐</span>
              Explore Properties
            </button>
            <Link
              href="/host"
              className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white px-6 sm:px-8 py-4 rounded-full font-bold transition-all text-center"
            >
              Become a Host
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
