'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function Hero() {
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
          <div className="mb-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white text-sm font-medium">
            <span>✨</span> Cedar Cineminic Cinherops
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-12 tracking-tight leading-tight">
            Find your <br />
            <span className="text-primary-500">wellness-friendly</span> <br />
            sanctuary
          </h1>

          {/* Minimal Search Bar */}
          <div className="flex items-center max-w-2xl bg-surface-dark/60 backdrop-blur-xl border border-white/10 rounded-full p-2 pl-6 shadow-2xl group hover:border-primary-500/50 transition-all">
            <div className="flex-1 flex items-center divide-x divide-white/10">
              <div className="px-4 py-2 flex flex-col">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Where</span>
                <input type="text" placeholder="Search destinations" className="bg-transparent text-white text-sm outline-none placeholder:text-white/40" />
              </div>
              <div className="px-4 py-2 flex flex-col">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">When</span>
                <span className="text-white text-sm">Add dates</span>
              </div>
              <div className="px-4 py-2 flex flex-col">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Who</span>
                <span className="text-white text-sm">2 Guests</span>
              </div>
            </div>
            <button className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform">
              <svg className="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 relative z-40">
            <Link 
              href="/search"
              className="bg-primary-500 text-black px-6 sm:px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-primary-400 transition-all shadow-[0_0_30px_rgba(0,230,118,0.3)] group"
            >
              <span className="text-xl group-hover:rotate-12 transition-transform">🌐</span>
              Explore Properties
            </Link>
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
