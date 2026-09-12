'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { listingGalleryImageUrl } from '@/lib/propertyImageUrls';

const HERO_PHRASES = [
  'wellness-friendly',
  '420 certified',
  'holistic-inclusive',
  'session-friendly',
] as const;

function RotatingHeroPhrase() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_PHRASES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const phrase = HERO_PHRASES[index];

  return (
    <span className="relative inline-grid overflow-hidden align-bottom text-[#E8C99A] dark:text-primary-500">
      {HERO_PHRASES.map((item) => (
        <span
          key={item}
          className="invisible col-start-1 row-start-1 whitespace-nowrap"
          aria-hidden
        >
          {item}
        </span>
      ))}
      {reduceMotion ? (
        <span className="col-start-1 row-start-1 whitespace-nowrap">{HERO_PHRASES[0]}</span>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={phrase}
            className="col-start-1 row-start-1 whitespace-nowrap"
            initial={{ opacity: 0, y: '0.45em' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-0.45em' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden
          >
            {phrase}
          </motion.span>
        </AnimatePresence>
      )}
    </span>
  );
}

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
  const rawBackgroundImageUrl = process.env.NEXT_PUBLIC_HERO_BACKGROUND_URL ||
    'https://okmudgacbpgycixtpoqx.supabase.co/storage/v1/object/public/hero-images/a7af8f52-573a-49db-a8a8-ee3cb49cbe69.jfif';
  const backgroundImageUrl = listingGalleryImageUrl(rawBackgroundImageUrl);

  return (
    <div className="relative h-[min(88dvh,620px)] sm:h-[580px] md:h-[700px] overflow-hidden">
      {/* Hero background - cover on mobile, contain on desktop to show full peace sign */}
      <div 
        className="absolute inset-0 bg-cover bg-center lg:bg-contain lg:bg-no-repeat lg:bg-right"
        style={{ 
          backgroundImage: `url(${backgroundImageUrl})`,
        }}
        role="img"
        aria-label="VibesBNB Hero"
      />
      {/* Background color fill for desktop when image doesn't cover full width */}
      <div className="absolute inset-0 bg-[#8B7355] -z-10" />
      {/* Light theme: darken the photo so cream/forest type stays readable. Dark keeps the original wash. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70 dark:from-surface-dark/40 dark:via-transparent dark:to-surface-dark" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent dark:from-transparent dark:via-transparent" />

      <div className="relative container mx-auto px-4 sm:px-6 h-full flex flex-col justify-center pb-24 sm:pb-16 md:pb-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl w-full min-w-0"
        >


          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#FAF3EA] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] mb-8 sm:mb-10 md:mb-12 tracking-tight leading-[1.08] sm:leading-tight dark:text-white dark:drop-shadow-none">
            Find your <br />
            <span className="sr-only">wellness-friendly, 420 certified, holistic-inclusive, and session-friendly </span>
            <RotatingHeroPhrase /> <br />
            sanctuary
          </h1>

          {/* Minimal Search Bar */}


          <div className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 relative z-40">
            <button
              onClick={() => handleSearch()}
              className="bg-[#193F25] text-[#FAF3EA] px-6 sm:px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-[#234F30] transition-all shadow-[0_12px_28px_rgba(25,63,37,0.28)] group dark:bg-primary-500 dark:text-black dark:hover:bg-primary-400 dark:shadow-[0_0_30px_rgba(0,230,118,0.3)]"
            >
              <Globe
                className="w-5 h-5 text-[#FFFFFF] dark:text-black group-hover:rotate-12 transition-transform"
                strokeWidth={2.25}
                aria-hidden
              />
              Explore Properties
            </button>
            <Link
              href="/host"
              className="bg-[#FAF3EA] text-[#193F25] border border-[#193F25]/35 hover:bg-[#F4E6D4] px-6 sm:px-8 py-4 rounded-full font-bold transition-all text-center shadow-[0_12px_28px_rgba(25,63,37,0.18)] dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-white dark:shadow-none"
            >
              Become a Host
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
