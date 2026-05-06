'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

/** Loading shell for the homepage featured grid: animated logo + indeterminate "Loading Vibes" bar */
export function FeaturedVibesLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Featured <span className="text-primary-500 italic">Vibes</span>
          </h2>
          <p className="text-muted max-w-xl">
            Discover our hand-picked collection of properties designed for your ultimate wellness journey.
          </p>
        </div>
        <span className="pointer-events-none flex items-center gap-2 text-primary-500/40 font-bold">
          View all properties
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </div>

      <div
        className="rounded-[2.5rem] border border-white/5 bg-surface/90 backdrop-blur-sm min-h-[320px] sm:min-h-[380px] flex flex-col items-center justify-center gap-8 py-14 px-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <motion.div
            className="relative flex items-center justify-center"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div
              className="relative rounded-full border border-white/10 bg-surface-dark p-3 shadow-[0_0_40px_rgba(0,230,118,0.12)]"
              animate={{
                rotate: [0, -3, 3, 0],
                scale: [1, 1.04, 1],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/logo.png"
                alt="VibesBNB"
                width={80}
                height={80}
                className="h-[72px] w-[72px] sm:h-20 sm:w-20 object-contain rounded-full"
                priority
              />
            </motion.div>
            <motion.span
              className="pointer-events-none absolute -inset-6 rounded-full bg-primary-500/15 blur-2xl"
              aria-hidden
              animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.85, 1, 0.85] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          <p className="text-lg sm:text-xl font-semibold text-white tracking-tight text-center">
            Loading Vibes
            <span className="inline-flex w-6 justify-start ml-0.5" aria-hidden>
              <motion.span
                className="inline-flex gap-0.5"
                initial={false}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="inline-block w-1 h-1 rounded-full bg-primary-500"
                    animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.18,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </motion.span>
            </span>
          </p>

          <div className="w-full">
            <div className="relative h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="absolute top-0 h-full w-[42%] rounded-full bg-gradient-to-r from-primary-700 via-primary-400 to-primary-500 shadow-[0_0_16px_rgba(0,230,118,0.45)] animate-vibes-loadbar" />
            </div>
          </div>

          <p className="text-muted text-sm text-center">
            Fetching the best stays for you…
          </p>
        </div>
      </div>
    </div>
  );
}
