'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Leaf, ShieldCheck, Trees, Users, Home, Sparkles } from 'lucide-react';

const pillars = [
  {
    icon: ShieldCheck,
    title: 'Verified wellness-friendly policies',
    body: 'Every listing is checked so you know where you stand, including clear wellness-friendly guidance, before you book.',
  },
  {
    icon: Leaf,
    title: 'Wellness-first stays',
    body: 'We put well-being at the center of travel. Spaces meant for rest, reset, and the kind of trip that actually leaves you better.',
  },
  {
    icon: Trees,
    title: 'Nature-inspired & soulful',
    body: 'From organic, sustainable standards to sanctuaries that feel grounded. We look for properties with soul, not just square footage.',
  },
];

const audiences = [
  {
    icon: Sparkles,
    title: 'Travellers',
    body: 'Find your wellness-friendly sanctuary. Stays where you can be yourself and catch the vibe you came for.',
  },
  {
    icon: Home,
    title: 'Hosts',
    body: 'Share a wellness-friendly space with guests who appreciate it. List, earn, and join a community that gets it.',
  },
  {
    icon: Users,
    title: 'Partners',
    body: 'Wellness partners connect with travellers who are already in the mood for a mindful, elevated escape.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface-dark text-white overflow-hidden">
      <div className="relative pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[28rem] h-[28rem] bg-primary-500/10 blur-[140px] rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full -translate-x-1/3 translate-y-1/4" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <p className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 px-4 py-2 rounded-full text-primary-500 text-xs font-bold mb-8 uppercase tracking-widest">
              About us
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Built to help you{' '}
              <span className="text-primary-500">catch a vibe</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted leading-relaxed max-w-2xl">
              VibesBNB is the wellness-friendly vacation rental marketplace for travellers who want more
              than a place to sleep. A sanctuary that feels good, looks after your well-being, and leaves
              room to unwind your way.
            </p>
          </motion.div>
        </div>
      </div>

      <section className="container mx-auto px-4 sm:px-6 pb-20 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-surface relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] p-8 sm:p-12 border border-white/5"
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight">
              Why <span className="text-primary-500">VibesBNB</span>
            </h2>
            <p className="text-muted text-base sm:text-lg leading-relaxed max-w-3xl">
              We&apos;re redefining travel by putting your well-being first. Every property is personally
              vetted to meet our organic, sustainable, and soulful standards. So when you book, you&apos;re
              choosing a stay that was chosen with intention.
            </p>
          </div>
        </motion.div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 pb-20 max-w-5xl">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            What we stand for
          </h2>
          <p className="text-muted max-w-2xl leading-relaxed">
            The same promises you&apos;ll find across our stays, made clear, so you know what vibes with us.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillars.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="bg-surface border border-white/5 rounded-[2rem] p-7 hover:border-primary-500/25 transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="text-lg font-bold mb-3 tracking-tight">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 pb-20 max-w-5xl">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Who it&apos;s for
          </h2>
          <p className="text-muted max-w-2xl leading-relaxed">
            One community: travellers looking for the right sanctuary, hosts sharing wellness-friendly
            spaces, and partners who help complete the trip.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {audiences.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-7"
              >
                <Icon className="w-6 h-6 text-primary-500 mb-4" />
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 pb-20 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
        >
          <p className="text-primary-500 text-xs font-bold uppercase tracking-widest mb-4">
            Meet the founders
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-10">
            The vision behind VibesBNB
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-8 md:gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="relative aspect-[3/4] w-full max-w-[280px] mx-auto md:mx-0 overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            >
              <Image
                src="/about/deontae-rodney-mack.png"
                alt="Deontae Rodney Mack, founder of VibesBNB"
                fill
                className="object-cover object-top"
                sizes="280px"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Deontae Rodney Mack
                </h3>
                <p className="text-primary-400 font-semibold mt-1">Founder, VibesBNB</p>
              </div>
              <div className="space-y-4 text-muted text-base sm:text-lg leading-relaxed">
                <p>
                  Deontae Rodney Mack is a pioneering entrepreneur at the forefront of wellness tourism.
                  As the founder of Vibesbnb, he&apos;s revolutionizing the way people experience travel with
                  mindful, wellness-first stays.
                </p>
                <p>
                  With over 8 years of experience as an Airbnb Superhost specializing in wellness-friendly
                  accommodations in Miami, Deontae identified a crucial gap in the market left by vacation
                  rentals.
                </p>
                <p>
                  He envisioned a platform that could seamlessly connect wellness-minded travellers with
                  welcoming, legal, and safe travel experiences. This vision gave birth to Vibesbnb.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 pb-28 sm:pb-32 max-w-5xl">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 justify-center">
          <Link
            href="/search"
            className="btn-primary text-center !py-4 px-8 font-bold rounded-2xl shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
          >
            Explore properties
          </Link>
          <Link
            href="/host"
            className="text-center !py-4 px-8 font-bold rounded-2xl border border-white/15 text-white hover:bg-white/5 transition"
          >
            Become a host
          </Link>
          <Link
            href="/coming-soon"
            className="text-center !py-4 px-8 font-bold rounded-2xl text-primary-400 hover:text-primary-300 transition"
          >
            See what&apos;s coming →
          </Link>
        </div>
        <p className="text-center text-muted text-sm mt-8">
          Questions? Reach us at{' '}
          <a href="mailto:hello@vibesbnb.com" className="text-primary-500 hover:text-primary-400">
            hello@vibesbnb.com
          </a>
        </p>
      </section>
    </div>
  );
}
