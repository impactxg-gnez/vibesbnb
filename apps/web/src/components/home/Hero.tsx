'use client';

import { motion } from 'framer-motion';

export function Hero() {
  // Hero background image URL from Supabase Storage
  // Can be overridden with NEXT_PUBLIC_HERO_BACKGROUND_URL environment variable
  const backgroundImageUrl = process.env.NEXT_PUBLIC_HERO_BACKGROUND_URL || 
    'https://okmudgacbpgycixtpoqx.supabase.co/storage/v1/object/public/hero-images/a7af8f52-573a-49db-a8a8-ee3cb49cbe69.jfif';
  
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes animate-background {
          0% {
            background-position: 0 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }
        .masked-text {
          font-size: 3rem;
          font-weight: bold;
          color: transparent;
          background-image: url('https://images.unsplash.com/photo-1732535725600-f805d8b33c9c?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
          background-size: 200%;
          background-position: 0 50%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: animate-background 5s infinite alternate linear;
        }
        @media (min-width: 768px) {
          .masked-text {
            font-size: 5rem;
          }
        }
      `}} />
      <div className="relative h-[500px] md:h-[600px] overflow-hidden">
        <img
          src={backgroundImageUrl}
          alt="VibesBNB - Peace, Love, Good Vibes"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // Fallback if image fails to load
            console.error('Background image failed to load:', backgroundImageUrl);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-gray-950/20 to-transparent" />
        
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="masked-text mb-4">
              Find your wellness-friendly sanctuary
            </h1>
            <p className="text-lg md:text-xl text-white drop-shadow-2xl" style={{ textShadow: '1px 1px 6px rgba(0, 0, 0, 0.8), 0 0 12px rgba(0, 0, 0, 0.6)' }}>
              Discover serene stays with spas, yoga decks, and curated wellness amenities.
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
