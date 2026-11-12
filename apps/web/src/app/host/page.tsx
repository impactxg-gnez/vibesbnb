'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Gift,
  Leaf,
  Link2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { HOST_FEE_PERCENT } from '@vibesbnb/shared';
import { useAuth } from '@/contexts/AuthContext';

/** VibesBNB hosts & community — Facebook group */
const HOST_COMMUNITY_FACEBOOK_URL =
  'https://www.facebook.com/groups/645550964117748/?ref=share_group_link&mibextid=wwXIfr&rdid=AYX08ycnTxLRiLps&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1QJyhdFhKg%2F%3Fmibextid%3DwwXIfr#';

const RATE_PRESETS = [
  { label: 'Cozy Studio', rate: 165 },
  { label: 'Poolside Villa', rate: 325 },
  { label: 'Wellness Retreat', rate: 480 },
] as const;

const HOST_FEATURES = [
  {
    icon: UploadCloud,
    title: '1-Click Airbnb Import',
    description:
      'Bring over your photos, title, amenities, and property details without rebuilding your listing from scratch.',
    accentBg: 'bg-[#193F25]/10 dark:bg-emerald-500/10',
    accentText: 'text-[#193F25] dark:text-emerald-400',
  },
  {
    icon: Calendar,
    title: 'Day-by-Day Calendar Pricing',
    description:
      'Set custom nightly rates for specific weekends, holidays, or local events, and block dates anytime.',
    accentBg: 'bg-[#B78438]/15 dark:bg-amber-500/10',
    accentText: 'text-[#9A6A22] dark:text-amber-400',
  },
  {
    icon: Leaf,
    title: 'Explicit Wellness Rules',
    description:
      'Publish clear indoor, patio, or smoke-free policies upfront so you only attract respectful, aligned guests.',
    accentBg: 'bg-emerald-600/10 dark:bg-emerald-500/10',
    accentText: 'text-emerald-700 dark:text-emerald-400',
  },
  {
    icon: Wallet,
    title: `Keep ${100 - HOST_FEE_PERCENT}% of Nightly Rent`,
    description:
      `Transparent ${HOST_FEE_PERCENT}% host fee on confirmed bookings with reliable Stripe payouts directly to your account.`,
    accentBg: 'bg-[#193F25]/10 dark:bg-emerald-500/10',
    accentText: 'text-[#193F25] dark:text-emerald-400',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Guest Party IDs',
    description:
      'Review verified government IDs for booking parties inside your dashboard before guest check-in.',
    accentBg: 'bg-blue-600/10 dark:bg-blue-500/10',
    accentText: 'text-blue-700 dark:text-blue-400',
  },
  {
    icon: Gift,
    title: 'Earn $25 Referring Hosts',
    description:
      'Share your host referral link and earn $25 in credits each time an invited host or guest completes a stay.',
    accentBg: 'bg-purple-600/10 dark:bg-purple-500/10',
    accentText: 'text-purple-700 dark:text-purple-400',
  },
] as const;

const LAUNCH_STEPS = [
  {
    step: '01',
    title: 'Create your host account',
    description:
      'Sign up and verify your email to unlock your host dashboard right away — no waitlist or manual approval gate.',
  },
  {
    step: '02',
    title: 'Import or add your stay',
    description:
      'Paste an Airbnb listing link or upload your own photos, custom calendar pricing, and clear house policies.',
  },
  {
    step: '03',
    title: 'Publish & welcome guests',
    description:
      'Go live in search when marked active, manage bookings in one place, and receive payouts cleanly.',
  },
] as const;

const PREVIEW_CALENDAR_DAYS = [
  { day: 'Thu', date: '14', price: '$210', blocked: false, highlight: false },
  { day: 'Fri', date: '15', price: '$285', blocked: false, highlight: true },
  { day: 'Sat', date: '16', price: '$285', blocked: false, highlight: true },
  { day: 'Sun', date: '17', price: '$225', blocked: false, highlight: false },
  { day: 'Mon', date: '18', price: 'Blocked', blocked: true, highlight: false },
  { day: 'Tue', date: '19', price: '$195', blocked: false, highlight: false },
  { day: 'Wed', date: '20', price: '$195', blocked: false, highlight: false },
] as const;

const HOST_FAQS = [
  {
    question: 'How much does it cost to list a property on VibesBNB?',
    answer: `Creating a host account and publishing listings is completely free. VibesBNB only charges a flat ${HOST_FEE_PERCENT}% host fee when you earn a confirmed booking, so you keep ${100 - HOST_FEE_PERCENT}% of your nightly rent.`,
  },
  {
    question: 'How quickly can my host account go live?',
    answer:
      'Activation is instant. Once you create a host account and verify your email address, you have immediate access to your host dashboard without waiting for manual review.',
  },
  {
    question: 'Do I have to allow smoking indoors to host on VibesBNB?',
    answer:
      'No. You have full control over each listing’s wellness and consumption policy — whether smoke-free, outdoor patio only, vaporizers only, or indoor friendly — clearly displayed before guests book.',
  },
  {
    question: 'Can I import my Airbnb listing and customize daily pricing?',
    answer:
      'Yes. You can import details and photos from an existing Airbnb link during listing creation, then use our calendar editor to set custom prices for specific dates, weekends, or holidays.',
  },
] as const;

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function HostEarningsCalculator() {
  const [nightlyRate, setNightlyRate] = useState(225);
  const [nightsPerMonth, setNightsPerMonth] = useState(15);

  const grossMonthly = nightlyRate * nightsPerMonth;
  const hostFee = Math.round(grossMonthly * (HOST_FEE_PERCENT / 100));
  const netMonthly = grossMonthly - hostFee;
  const annualEstimate = netMonthly * 12;

  return (
    <div className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-[0_24px_60px_rgba(81,55,43,0.08)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#193F25]/10 dark:bg-emerald-500/15 text-[#193F25] dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5" />
          Earnings Estimator
        </div>
        <span className="text-xs font-semibold text-[#51372B]/70 dark:text-gray-400">
          {100 - HOST_FEE_PERCENT}% host payout
        </span>
      </div>

      {/* Main Net Estimate Display */}
      <div className="rounded-2xl bg-[#FAF3EA] dark:bg-gray-800/80 border border-[#51372B]/10 dark:border-white/10 p-5 mb-6">
        <div className="text-xs font-bold uppercase tracking-wider text-[#51372B]/70 dark:text-gray-400">
          Estimated monthly take-home
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#193F25] dark:text-emerald-400 tabular-nums">
            {formatCurrency(netMonthly)}
          </span>
          <span className="text-sm font-semibold text-[#51372B]/75 dark:text-gray-300">/ month</span>
        </div>
        <div className="mt-3 pt-3 border-t border-[#51372B]/10 dark:border-white/10 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="block text-[#51372B]/65 dark:text-gray-400">Gross rent</span>
            <strong className="font-bold text-[#51372B] dark:text-white tabular-nums">
              {formatCurrency(grossMonthly)}
            </strong>
          </div>
          <div>
            <span className="block text-[#51372B]/65 dark:text-gray-400">Host fee ({HOST_FEE_PERCENT}%)</span>
            <strong className="font-bold text-[#51372B] dark:text-white tabular-nums">
              -{formatCurrency(hostFee)}
            </strong>
          </div>
          <div>
            <span className="block text-[#51372B]/65 dark:text-gray-400">Annual est.</span>
            <strong className="font-bold text-[#193F25] dark:text-emerald-400 tabular-nums">
              {formatCurrency(annualEstimate)}
            </strong>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-5">
        <span className="block text-xs font-bold uppercase tracking-wider text-[#51372B]/70 dark:text-gray-400 mb-2">
          Try a typical space
        </span>
        <div className="grid grid-cols-3 gap-2">
          {RATE_PRESETS.map((preset) => {
            const isActive = nightlyRate === preset.rate;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setNightlyRate(preset.rate)}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-center ${
                  isActive
                    ? 'btn-forest-solid shadow-sm'
                    : 'bg-[#FAF3EA] dark:bg-gray-800 border border-[#51372B]/15 dark:border-white/10 text-[#51372B] dark:text-gray-200 hover:bg-[#ECD5BB]/60 dark:hover:bg-gray-700'
                }`}
              >
                <span className="block truncate">{preset.label}</span>
                <span className="block text-[11px] opacity-80 font-semibold">${preset.rate}/nt</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Sliders */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <label htmlFor="host-nightly-rate" className="text-[#51372B] dark:text-gray-200">
              Nightly rate
            </label>
            <span className="font-mono text-sm text-[#193F25] dark:text-emerald-400 tabular-nums">
              ${nightlyRate} / night
            </span>
          </div>
          <input
            id="host-nightly-rate"
            type="range"
            min={75}
            max={900}
            step={5}
            value={nightlyRate}
            onChange={(e) => setNightlyRate(Number(e.target.value))}
            className="w-full h-2 rounded-lg cursor-pointer accent-[#193F25] dark:accent-emerald-400 bg-[#ECD5BB] dark:bg-gray-800"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <label htmlFor="host-booked-nights" className="text-[#51372B] dark:text-gray-200">
              Nights booked per month
            </label>
            <span className="font-mono text-sm text-[#193F25] dark:text-emerald-400 tabular-nums">
              {nightsPerMonth} night{nightsPerMonth === 1 ? '' : 's'}
            </span>
          </div>
          <input
            id="host-booked-nights"
            type="range"
            min={1}
            max={30}
            step={1}
            value={nightsPerMonth}
            onChange={(e) => setNightsPerMonth(Number(e.target.value))}
            className="w-full h-2 rounded-lg cursor-pointer accent-[#193F25] dark:accent-emerald-400 bg-[#ECD5BB] dark:bg-gray-800"
          />
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-[#51372B]/65 dark:text-gray-400">
        Illustrative estimate based on your selected nightly rate and booked nights after the {HOST_FEE_PERCENT}% host
        service fee (excludes cleaning fees and taxes).
      </p>

      <Link
        href="/signup?type=host"
        className="mt-5 w-full btn-forest-solid py-3.5 px-5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
      >
        List your stay at ${nightlyRate}/night
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function HostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (loading) return;
    const role = user?.user_metadata?.role || 'traveller';
    if (user && (role === 'host' || role === 'host_pending')) {
      router.replace('/host/dashboard');
    }
  }, [user, loading, router]);

  const role = user?.user_metadata?.role || 'traveller';
  if (!loading && user && (role === 'host' || role === 'host_pending')) {
    return (
      <div className="min-h-screen bg-[#FAF3EA] dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#193F25] dark:border-emerald-500 mx-auto mb-4" />
          <p className="text-[#51372B]/75 dark:text-gray-400 font-medium">Redirecting to host dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#51372B] dark:bg-gray-950 dark:text-white overflow-x-clip">
      {/* Subtle Ambient Glow */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[540px] overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#193F25]/10 dark:bg-emerald-500/10 blur-[120px]" />
          <div className="absolute top-32 -left-24 w-[340px] h-[340px] rounded-full bg-[#B78438]/15 dark:bg-emerald-500/5 blur-[110px]" />
        </div>

        {/* 1. Split Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 pt-12 pb-14 sm:pt-16 sm:pb-20 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Hero Left Column */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#193F25]/10 dark:bg-emerald-500/15 border border-[#193F25]/20 dark:border-emerald-500/25 text-[#193F25] dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                VibesBNB Hosting · {HOST_FEE_PERCENT}% Host Fee
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-[#193F25] dark:text-white">
                Share your sanctuary.{' '}
                <span className="text-[#B78438] dark:text-emerald-400">Keep {100 - HOST_FEE_PERCENT}% of the stay.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#51372B]/80 dark:text-gray-300 leading-relaxed max-w-xl">
                Connect your space with respectful wellness and cannabis-friendly travelers. Create a host account,
                verify your email for instant access, import listings in seconds, and stay in complete control of your
                house rules.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Link
                  href="/signup?type=host"
                  className="btn-forest-solid px-7 py-4 rounded-2xl text-base font-bold text-center inline-flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  Create host account
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login?redirect=/host/properties"
                  className="px-7 py-4 rounded-2xl text-base font-bold text-center border border-[#51372B]/25 dark:border-white/20 bg-white/80 dark:bg-white/5 text-[#51372B] dark:text-white hover:bg-white dark:hover:bg-white/10 transition-colors"
                >
                  Host sign in
                </Link>
              </div>

              {/* Compact Trust Pills */}
              <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs sm:text-sm font-semibold text-[#51372B]/85 dark:text-gray-300">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#193F25] dark:text-emerald-400 shrink-0" />
                  Instant host activation
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#B78438] dark:text-emerald-400 shrink-0" />
                  1-click Airbnb import
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#193F25] dark:text-emerald-400 shrink-0" />
                  Verified guest party IDs
                </span>
              </div>

              {user && role === 'traveller' && (
                <div className="mt-4 rounded-2xl border border-[#B78438]/35 bg-[#B78438]/10 dark:border-amber-500/30 dark:bg-amber-500/10 p-4 text-sm text-[#51372B] dark:text-amber-100 max-w-xl">
                  <strong className="font-bold text-[#193F25] dark:text-amber-300">Signed in as a traveler:</strong>{' '}
                  Click <strong>Create host account</strong> with the email you want for hosting (or sign out first if
                  you prefer a single email for both).
                </div>
              )}
            </motion.div>

            {/* Hero Right Column: Interactive Earnings Estimator */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <HostEarningsCalculator />
            </motion.div>
          </div>
        </section>
      </div>

      {/* 2. Platform Advantages Bento Grid */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-6xl">
        <div className="max-w-2xl mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#B78438] dark:text-emerald-400">
            Built for modern hosts
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#193F25] dark:text-white">
            Why host on VibesBNB?
          </h2>
          <p className="mt-3 text-base text-[#51372B]/75 dark:text-gray-300 leading-relaxed">
            Every tool in the host dashboard is designed to give you clear policy control, competitive payouts, and
            fast listing setup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {HOST_FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.05 }}
                className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-[#193F25]/35 dark:hover:border-emerald-500/35 transition-all group"
              >
                <div
                  className={`w-12 h-12 rounded-2xl ${feature.accentBg} ${feature.accentText} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#193F25] dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-[#51372B]/75 dark:text-gray-300 leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 3. Spotlight: Airbnb Import & Custom Daily Calendar */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-6xl">
        <div className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-white/10 rounded-[2rem] p-6 sm:p-10 lg:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B78438]/15 dark:bg-amber-500/15 text-[#9A6A22] dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Link2 className="w-3.5 h-3.5" />
                Switch without rebuilding
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#193F25] dark:text-white">
                Import your Airbnb stay &amp; customize prices by the day
              </h2>
              <p className="text-sm sm:text-base text-[#51372B]/80 dark:text-gray-300 leading-relaxed">
                Already hosting on another platform? Paste your Airbnb listing URL during setup to pull in photos and
                property details automatically — then use your VibesBNB calendar to adjust nightly rates day-by-day.
              </p>

              <ul className="space-y-3 pt-1">
                <li className="flex items-start gap-2.5 text-sm font-medium text-[#51372B] dark:text-gray-200">
                  <Check className="w-4 h-4 text-[#193F25] dark:text-emerald-400 shrink-0 mt-0.5" />
                  Automatic photo gallery, amenities &amp; description import
                </li>
                <li className="flex items-start gap-2.5 text-sm font-medium text-[#51372B] dark:text-gray-200">
                  <Check className="w-4 h-4 text-[#193F25] dark:text-emerald-400 shrink-0 mt-0.5" />
                  Flexible date-level pricing overrides for peak weekends &amp; festivals
                </li>
                <li className="flex items-start gap-2.5 text-sm font-medium text-[#51372B] dark:text-gray-200">
                  <Check className="w-4 h-4 text-[#193F25] dark:text-emerald-400 shrink-0 mt-0.5" />
                  Explicit wellness &amp; consumption settings for clear guest expectations
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/signup?type=host"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#193F25] dark:text-emerald-400 hover:underline"
                >
                  Start importing your property
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Visual Preview Card */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl bg-[#FAF3EA] dark:bg-gray-800/70 border border-[#51372B]/15 dark:border-white/10 p-5 sm:p-6 space-y-5">
                {/* Importer Pill Bar */}
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-[#51372B]/10 dark:border-white/10 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#193F25]/10 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-[#193F25] dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-mono truncate text-[#51372B]/80 dark:text-gray-300">
                      airbnb.com/rooms/miami-garden-villa
                    </span>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>

                {/* Day-by-Day Calendar Pricing Mock */}
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-[#51372B]/10 dark:border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#51372B]/70 dark:text-gray-400">
                      Calendar &amp; Daily Pricing
                    </span>
                    <span className="text-[11px] font-semibold text-[#193F25] dark:text-emerald-400">
                      Click any date to customize
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {PREVIEW_CALENDAR_DAYS.map((slot) => (
                      <div
                        key={slot.date}
                        className={`rounded-xl p-2 border transition-colors ${
                          slot.blocked
                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                            : slot.highlight
                            ? 'bg-[#193F25]/10 dark:bg-emerald-500/15 border-[#193F25]/35 dark:border-emerald-500/40'
                            : 'bg-[#FAF3EA]/60 dark:bg-gray-800/50 border-[#51372B]/10 dark:border-white/10'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase text-[#51372B]/60 dark:text-gray-400">
                          {slot.day}
                        </div>
                        <div className="text-xs font-extrabold text-[#51372B] dark:text-white mt-0.5">{slot.date}</div>
                        <div
                          className={`mt-1 text-[10px] font-bold tabular-nums ${
                            slot.blocked
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-[#193F25] dark:text-emerald-400'
                          }`}
                        >
                          {slot.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Policy Chips */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-[#51372B]/10 dark:border-white/10 text-xs font-semibold text-[#51372B] dark:text-gray-200">
                    <Leaf className="w-3.5 h-3.5 text-[#193F25] dark:text-emerald-400" />
                    Patio Wellness OK
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-[#51372B]/10 dark:border-white/10 text-xs font-semibold text-[#51372B] dark:text-gray-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#193F25] dark:text-emerald-400" />
                    Guest ID Required
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-[#51372B]/10 dark:border-white/10 text-xs font-semibold text-[#51372B] dark:text-gray-200">
                    <Clock className="w-3.5 h-3.5 text-[#B78438] dark:text-amber-400" />
                    Instant Approval
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 3-Step Visual Launch Timeline */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#B78438] dark:text-emerald-400">
            Simple onboarding
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#193F25] dark:text-white">
            Go live in three steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {LAUNCH_STEPS.map((item) => (
            <div
              key={item.step}
              className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-11 h-11 rounded-2xl btn-forest-solid flex items-center justify-center text-sm font-black mb-5 shadow-sm">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-[#193F25] dark:text-white mb-2.5">{item.title}</h3>
                <p className="text-sm text-[#51372B]/75 dark:text-gray-300 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Host Referral Program & Community Split */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Refer a Host Card */}
          <div className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-white/10 rounded-3xl p-7 sm:p-9 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#B78438]/15 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B78438]/15 dark:bg-emerald-500/15 text-[#9A6A22] dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Gift className="w-3.5 h-3.5" />
                Referral Dashboard
              </div>
              <h3 className="text-2xl font-extrabold text-[#193F25] dark:text-white mb-3">
                Know another host? Earn $25
              </h3>
              <p className="text-sm sm:text-base text-[#51372B]/80 dark:text-gray-300 leading-relaxed mb-7">
                Share your personal referral link with fellow property owners or travelers. Track every invite, stay
                status, and reward credit in your Referral Dashboard.
              </p>
            </div>
            <div className="relative z-10">
              <Link
                href="/referrals"
                className="btn-forest-solid inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold shadow-sm transition-all"
              >
                Open referral dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Facebook Community Card */}
          <div className="bg-[#193F25]/5 dark:bg-emerald-500/10 border border-[#193F25]/20 dark:border-emerald-500/25 rounded-3xl p-7 sm:p-9 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#193F25]/15 dark:bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#193F25]/10 dark:bg-emerald-500/20 text-[#193F25] dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
                <Users className="w-3.5 h-3.5" />
                Host Community
              </div>
              <h3 className="text-2xl font-extrabold text-[#193F25] dark:text-white mb-3">
                Connect with VibesBNB hosts
              </h3>
              <p className="text-sm sm:text-base text-[#51372B]/80 dark:text-gray-300 leading-relaxed mb-7">
                Meet other VibesBNB property owners, swap hosting tips, share hospitality advice, and get early feature
                updates inside our official Facebook group.
              </p>
            </div>
            <div className="relative z-10">
              <a
                href={HOST_COMMUNITY_FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-gray-900 border border-[#51372B]/20 dark:border-white/20 text-[#193F25] dark:text-white hover:bg-[#FAF3EA] dark:hover:bg-gray-800 text-sm font-bold shadow-sm transition-colors"
              >
                Open Facebook group
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Host FAQ Accordion */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#193F25] dark:text-white">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-sm text-[#51372B]/75 dark:text-gray-300">
            Quick answers before you create your first listing.
          </p>
        </div>

        <div className="space-y-3">
          {HOST_FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={item.question}
                className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[#193F25] dark:text-white hover:bg-[#FAF3EA]/60 dark:hover:bg-white/5 transition-colors"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[#51372B]/70 dark:text-gray-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-[#51372B]/80 dark:text-gray-300 leading-relaxed border-t border-[#51372B]/10 dark:border-white/5">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Bottom CTA Strip */}
      <section className="container mx-auto px-4 sm:px-6 pt-6 pb-24 max-w-6xl">
        <div className="rounded-[2.25rem] bg-[#193F25] dark:bg-gray-900 border border-[#193F25] dark:border-emerald-500/30 p-8 sm:p-12 text-center shadow-lg relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-400/15 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#FAF3EA] dark:text-white">
              Ready to welcome your first guests?
            </h2>
            <p className="text-sm sm:text-base text-[#ECD5BB]/90 dark:text-gray-300 leading-relaxed">
              Create your host account in seconds, import or build your listing, and set the exact vibe for your stay.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/signup?type=host"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#FAF3EA] hover:bg-white dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#193F25] dark:text-black font-bold text-base shadow-md inline-flex items-center justify-center gap-2 transition-colors"
              >
                Create host account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login?redirect=/host/properties"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-[#FAF3EA]/35 dark:border-white/20 text-[#FAF3EA] dark:text-white hover:bg-white/10 font-bold text-base inline-flex items-center justify-center transition-colors"
              >
                Host sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
