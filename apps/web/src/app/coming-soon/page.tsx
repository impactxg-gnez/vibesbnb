'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Package,
  Plane,
  Map,
  Car,
  Gamepad2,
  Compass,
  ArrowRight,
} from 'lucide-react';

const upcoming = [
  {
    icon: Package,
    title: 'Essentials',
    headline: 'Your holiday stash, delivered',
    body: 'Kick back the moment you arrive. We bring wellness essentials straight to your VibesBNB property so the only thing on your itinerary is settling into the vibe.',
  },
  {
    icon: Plane,
    title: 'Pickup & Drop',
    headline: 'Door-to-door holiday flow',
    body: 'Land, leave the logistics to us. Schedule pickups and drops to and from bus stops and airports. Arrive soft, depart easy, stay in vacation mode the whole way.',
  },
  {
    icon: Map,
    title: 'Guides',
    headline: 'A city that feels like yours',
    body: 'Local guides walk you through the places you\'re visiting with a complete itinerary planned: the spots worth lingering, the corners worth discovering, zero guesswork.',
  },
  {
    icon: Car,
    title: 'Chauffeurs & Butlers',
    headline: 'White-glove holiday ease',
    body: 'A dedicated chauffeur and butler for VibesBNB guests. Rides when you want them, details handled when you don’t. Travel that feels looked after.',
  },
  {
    icon: Gamepad2,
    title: 'Gaming',
    headline: 'Level up your staycation',
    body: 'Consoles and PCs delivered into your VibesBNB home for gaming enthusiasts. Rainy afternoons, late-night sessions, and holiday downtime done right.',
  },
  {
    icon: Compass,
    title: 'Trip planner',
    headline: 'Your escape, mapped out',
    body: 'Trips planned for solo travellers, families, and couples so the holiday shape fits how you actually travel, not a one-size-fits-all checklist.',
  },
];

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-surface-dark text-white overflow-hidden">
      <div className="relative pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-primary-500/5 rounded-full blur-[140px] translate-x-1/4" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/40 px-5 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-primary-400 font-bold text-xs uppercase tracking-widest">
                Coming soon
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
              The holiday vibe{' '}
              <span className="text-primary-500">is just getting started</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted leading-relaxed max-w-2xl">
              Stays are only the beginning. We&apos;re building the extras that turn a booking into a full
              escape: delivered, planned, and ready when you are. Same wellness-friendly spirit.
              More ways to catch the vibe.
            </p>
          </motion.div>
        </div>
      </div>

      <section className="container mx-auto px-4 sm:px-6 pb-20 max-w-5xl">
        <div className="space-y-5">
          {upcoming.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: Math.min(index * 0.05, 0.3) }}
                className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-surface p-6 sm:p-8 md:p-10 hover:border-primary-500/30 transition-colors duration-500"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_0%_0%,rgba(0,230,118,0.07),transparent_55%)] pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row gap-6 sm:gap-8">
                  <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-primary-500 text-xs font-bold uppercase tracking-widest mb-2">
                      {feature.title}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 group-hover:text-primary-400 transition-colors">
                      {feature.headline}
                    </h2>
                    <p className="text-muted leading-relaxed max-w-2xl">{feature.body}</p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 pb-28 sm:pb-32 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-surface p-8 sm:p-12 text-center"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary-500/10 blur-[100px] rounded-full -translate-y-1/2 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Want first dibs on the vibe?
            </h2>
            <p className="text-muted max-w-xl mx-auto mb-8 leading-relaxed">
              Join early access as a traveller, host, service host, or dispensary partner and be ready
              when these holiday extras roll out.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 justify-center">
              <Link
                href="/early-access"
                className="inline-flex items-center justify-center gap-2 btn-primary !py-4 px-8 font-bold rounded-2xl shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
              >
                Get early access
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/search"
                className="text-center !py-4 px-8 font-bold rounded-2xl border border-white/15 text-white hover:bg-white/5 transition"
              >
                Browse stays now
              </Link>
              <Link
                href="/about"
                className="text-center !py-4 px-8 font-bold rounded-2xl text-primary-400 hover:text-primary-300 transition"
              >
                About VibesBNB →
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
