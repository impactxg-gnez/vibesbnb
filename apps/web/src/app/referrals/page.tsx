'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { referralAffiliateConfig as config, isReferralAffiliateEnabledClient } from '@/lib/referrals/config';
import {
  Copy,
  Check,
  Share2,
  Users,
  Gift,
  DollarSign,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  HelpCircle,
  Building2,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type InviteItem = {
  id: string;
  referredUserId: string;
  name: string;
  emailMasked: string | null;
  role: 'Host' | 'Traveler';
  createdAt: string;
  completedAt: string | null;
  status: 'pending' | 'completed' | 'void';
  hasBooking: boolean;
  rewardCredits: number;
  pendingCredits: number;
};

type Summary = {
  enabled: boolean;
  code?: string;
  link?: string;
  hostLink?: string;
  creditBalance?: number;
  rewardCredits?: number;
  friendDiscountUsd?: number;
  stats?: {
    totalInvited: number;
    completedStays: number;
    pendingStays: number;
    totalCreditsEarned: number;
    creditBalance: number;
  };
  invites?: InviteItem[];
  affiliate?: {
    code: string;
    link: string;
    commissionEarned: number;
    pendingCommission?: number;
    clicksCount?: number;
    conversionsCount?: number;
    status: string;
  } | null;
};

const steps = [
  {
    step: '1',
    title: 'Share your personal link',
    body: 'Send your Host or Traveler referral link to friends, peers, or host communities.',
  },
  {
    step: '2',
    title: 'They create an account',
    body: 'They sign up with your link. Your referral code is automatically attached to their profile.',
  },
  {
    step: '3',
    title: 'They get $25 off stay fee',
    body: `On their first booking, they save ${money(config.friendServiceFeeDiscountUsd)} directly off the guest service fee.`,
  },
  {
    step: '4',
    title: 'You earn $25 in credits',
    body: `Once their stay completes, you receive ${config.referralRewardCredits} credits (${money(config.referralRewardCredits)}) to use on your future stays!`,
  },
];

const benefits = [
  {
    title: 'Earn credits after every completed stay',
    body: `You receive ${config.referralRewardCredits} credits as soon as their stay check-out date passes, provided the booking was not cancelled or refunded.`,
  },
  {
    title: 'Credits spend like cash on service fees',
    body: `1 credit equals ${money(config.creditValueUsd)}. Credits automatically apply to the guest service fee on your bookings.`,
  },
  {
    title: 'Instant saving for the person you refer',
    body: `Your friend gets ${money(config.friendServiceFeeDiscountUsd)} off the guest service fee on their first booking.`,
  },
  {
    title: 'No expiration for 12 months',
    body: `Credits remain valid on your account for ${config.creditExpiryMonths} months from the day they are issued. Oldest credits apply first.`,
  },
];

export default function ReferAHostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [copiedType, setCopiedType] = useState<'host' | 'guest' | 'code' | null>(null);
  const [activeTab, setActiveTab] = useState<'host' | 'guest'>('host');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    if (!isReferralAffiliateEnabledClient()) return;
    let cancelled = false;

    async function fetchSummary() {
      try {
        const res = await fetch('/api/referrals/me', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as Summary;
        if (cancelled) return;

        // Clean link origin so it never displays a vercel.app preview URL
        if (data.link) {
          data.link = data.link.replace(/https?:\/\/[^/]*vercel\.app/i, 'https://vibesbnb.com');
        }
        if (data.hostLink) {
          data.hostLink = data.hostLink.replace(/https?:\/\/[^/]*vercel\.app/i, 'https://vibesbnb.com');
        } else if (data.link) {
          data.hostLink = `${data.link}?type=host`;
        }
        if (data.affiliate?.link) {
          data.affiliate.link = data.affiliate.link.replace(/https?:\/\/[^/]*vercel\.app/i, 'https://vibesbnb.com');
        }

        setSummary(data);
      } catch (err) {
        console.warn('Failed to load referral summary:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const rawLink = summary?.link || (summary?.code ? `https://vibesbnb.com/r/${summary.code}` : '');
  const hostLink = summary?.hostLink || (rawLink ? `${rawLink}?type=host` : '');
  const activeLink = activeTab === 'host' ? hostLink : rawLink;

  const copyToClipboard = async (text: string, type: 'host' | 'guest' | 'code') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      toast.success(type === 'code' ? 'Referral code copied!' : 'Referral link copied to clipboard!');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  const handleShare = async () => {
    if (!user) {
      router.push('/login?next=/referrals');
      return;
    }
    const link = activeLink;
    if (!link) {
      toast.error('Referral link not ready yet.');
      return;
    }

    const shareTitle = activeTab === 'host' ? 'List your stay on VibesBNB' : 'Join VibesBNB and get $25 off';
    const shareText = activeTab === 'host'
      ? `List your wellness stay on VibesBNB with my referral link. You'll get premium booking demand and verified guests!`
      : `Join VibesBNB with my referral link and get ${money(config.friendServiceFeeDiscountUsd)} off the guest service fee on your first booking!`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: link });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    await copyToClipboard(link, activeTab);
  };

  const invites = summary?.invites || [];
  const filteredInvites = invites.filter((item) => {
    if (filterStatus === 'completed') return item.status === 'completed';
    if (filterStatus === 'pending') return item.status === 'pending';
    return true;
  });

  const stats = summary?.stats || {
    totalInvited: invites.length,
    completedStays: invites.filter((i) => i.status === 'completed').length,
    pendingStays: invites.filter((i) => i.status === 'pending').length,
    totalCreditsEarned: invites.filter((i) => i.status === 'completed').length * config.referralRewardCredits,
    creditBalance: summary?.creditBalance || 0,
  };

  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#51372B] py-12 dark:bg-gray-950 dark:text-white">
      <div className="container mx-auto px-4 max-w-5xl space-y-8">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#193F25] hover:underline dark:text-emerald-400"
            >
              ← Back to account
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 text-[#193F25] dark:text-white">
              Refer a Host & Earn Rewards
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#51372B]/80 dark:text-gray-300 max-w-2xl">
              Invite hosts to list their properties and friends to book wellness stays. You both earn{' '}
              <strong className="text-[#193F25] dark:text-emerald-400">$25 in rewards</strong> when they complete their first stay!
            </p>
          </div>

          {/* Quick Balance Badge */}
          <div className="self-start sm:self-auto bg-white dark:bg-gray-900 border border-[#193F25]/20 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-[200px]">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Available Credits
            </span>
            <div className="text-2xl font-black text-[#193F25] dark:text-emerald-400 mt-0.5">
              ${stats.creditBalance.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Applies directly to service fees
            </p>
          </div>
        </div>

        {/* Share & Invite Card */}
        <div className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#193F25]/10 dark:bg-emerald-500/10 text-[#193F25] dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Your Personal Referral Links
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Share Your Link</h2>
              <p className="text-sm text-[#51372B]/75 dark:text-gray-300 mt-1">
                Choose whether you&apos;re sharing with another host or a guest traveler:
              </p>
            </div>

            {/* Tab Toggle: Host Link vs Guest Link */}
            <div className="inline-flex rounded-xl bg-[#FAF3EA] dark:bg-gray-800 p-1 border border-[#51372B]/15 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab('host')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'host'
                    ? 'btn-forest-solid shadow-sm'
                    : 'text-[#51372B]/80 dark:text-gray-400 hover:text-[#51372B] dark:hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Refer a Host
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guest')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'guest'
                    ? 'btn-forest-solid shadow-sm'
                    : 'text-[#51372B]/80 dark:text-gray-400 hover:text-[#51372B] dark:hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Refer a Guest
              </button>
            </div>
          </div>

          {/* Link Box & Code Display */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {activeTab === 'host' ? 'Host Referral Link' : 'Guest Referral Link'}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={loading ? 'Generating your link…' : activeLink || 'Sign in to see your link'}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-4 py-3.5 pr-32 text-sm font-mono text-[#193F25] dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-[#193F25] dark:focus:ring-emerald-400 select-all"
                />
                <button
                  type="button"
                  onClick={() => void copyToClipboard(activeLink, activeTab)}
                  disabled={!activeLink || loading}
                  className="absolute right-2 px-4 py-2 rounded-xl btn-forest-solid hover:opacity-95 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {copiedType === activeTab ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Your Referral Code
              </label>
              <div className="relative flex items-center">
                <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-4 py-3.5 pr-32 text-sm font-mono font-bold tracking-widest text-[#193F25] dark:text-emerald-300">
                  {loading ? '…' : summary?.code || '—'}
                </div>
                {summary?.code ? (
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(summary.code || '', 'code')}
                    className="absolute right-2 px-3.5 py-2 rounded-xl btn-forest-solid hover:opacity-95 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedType === 'code' ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Quick Social Share Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Quick share via:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Join VibesBNB with my link and get $25 off your stay: ${activeLink}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#51372B]/20 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-[#51372B] dark:text-gray-200 hover:bg-[#FAF3EA] dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <span>WhatsApp</span>
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent('Join VibesBNB & Get $25 Off')}&body=${encodeURIComponent(
                  `Hi,\n\nI wanted to invite you to VibesBNB. You can join with my referral link and get $25 off your booking fee:\n\n${activeLink}\n\nEnjoy!`
                )}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#51372B]/20 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-[#51372B] dark:text-gray-200 hover:bg-[#FAF3EA] dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <span>Email</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `Check out @VibesBNB! Get $25 off your first wellness stay booking fee with my referral link: ${activeLink}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#51372B]/20 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-[#51372B] dark:text-gray-200 hover:bg-[#FAF3EA] dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <span>X / Twitter</span>
              </a>

              <button
                type="button"
                onClick={() => void handleShare()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#193F25]/30 bg-[#193F25]/10 dark:bg-emerald-500/10 text-[#193F25] dark:text-emerald-400 text-xs font-bold hover:bg-[#193F25]/20 dark:hover:bg-emerald-500/20 transition-colors shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Metric Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total Invited
              </span>
              <div className="w-8 h-8 rounded-full bg-[#193F25]/10 dark:bg-emerald-500/10 flex items-center justify-center text-[#193F25] dark:text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold mt-3 text-gray-900 dark:text-white">
              {stats.totalInvited}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Friends joined</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Completed Stays
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold mt-3 text-emerald-600 dark:text-emerald-400">
              {stats.completedStays}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.pendingStays} stay{stats.pendingStays === 1 ? '' : 's'} pending
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Credits Earned
              </span>
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold mt-3 text-purple-600 dark:text-purple-400">
              ${stats.totalCreditsEarned}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All-time rewards</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Friend Discount
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold mt-3 text-amber-600 dark:text-amber-400">
              ${config.friendServiceFeeDiscountUsd}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Off their first stay fee</p>
          </div>
        </div>

        {/* Invited People / Referrals Activity Table */}
        <div className="bg-white dark:bg-gray-900 border border-[#51372B]/15 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#193F25] dark:text-emerald-400" />
                Invited Hosts & Friends
              </h2>
              <p className="text-sm text-[#51372B]/75 dark:text-gray-300 mt-1">
                Track everyone who signed up using your link and their stay completion status.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="inline-flex rounded-xl bg-[#FAF3EA] dark:bg-gray-800 p-1 border border-[#51372B]/15 dark:border-gray-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'all'
                    ? 'btn-forest-solid shadow-sm'
                    : 'text-[#51372B]/75 dark:text-gray-400 hover:text-[#51372B]'
                }`}
              >
                All ({invites.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'completed'
                    ? 'btn-forest-solid shadow-sm'
                    : 'text-[#51372B]/75 dark:text-gray-400 hover:text-[#51372B]'
                }`}
              >
                Completed ({stats.completedStays})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'pending'
                    ? 'btn-forest-solid shadow-sm'
                    : 'text-[#51372B]/75 dark:text-gray-400 hover:text-[#51372B]'
                }`}
              >
                Pending ({stats.pendingStays})
              </button>
            </div>
          </div>

          {/* Table or Empty State */}
          {filteredInvites.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#193F25]/10 dark:bg-emerald-500/10 text-[#193F25] dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold">No invites recorded yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Once friends or other hosts sign up using your link, they will appear here along with their stay completion status and rewards.
              </p>
              <button
                type="button"
                onClick={() => void copyToClipboard(activeLink, activeTab)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full btn-forest-solid font-semibold text-sm hover:opacity-95 transition-opacity shadow-sm"
              >
                <Copy className="w-4 h-4" /> Copy your link now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-2">Invited Member</th>
                    <th className="py-3 px-2">Account Type</th>
                    <th className="py-3 px-2">Joined</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Your Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredInvites.map((invite) => {
                    const joinedDate = invite.createdAt
                      ? new Date(invite.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—';

                    return (
                      <tr key={invite.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-3.5 px-2 font-medium">
                          <div className="text-gray-900 dark:text-white font-semibold">
                            {invite.name}
                          </div>
                          {invite.emailMasked ? (
                            <div className="text-xs text-gray-400">{invite.emailMasked}</div>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              invite.role === 'Host'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}
                          >
                            {invite.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-gray-500 dark:text-gray-400">
                          {joinedDate}
                        </td>
                        <td className="py-3.5 px-2">
                          {invite.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Stay Completed
                            </span>
                          ) : invite.hasBooking ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                              <Calendar className="w-3.5 h-3.5" /> Stay Booked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              <Clock className="w-3.5 h-3.5" /> Pending First Stay
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-right font-bold">
                          {invite.status === 'completed' ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              +${invite.rewardCredits} Credits
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              ${config.referralRewardCredits} pending stay
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Affiliate Section (if user is also an approved affiliate) */}
        {summary?.affiliate ? (
          <div className="bg-white dark:bg-gray-900 border border-purple-500/20 dark:border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Official Affiliate Partner
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">Affiliate Dashboard</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  You earn {config.affiliateCommissionRate * 100}% cash commission on the rent of any booking made via your link.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase text-gray-400 font-semibold">Total Earned</span>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  ${(summary.affiliate.commissionEarned || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs uppercase text-gray-400 font-bold">Affiliate Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={summary.affiliate.link}
                    className="w-full text-xs font-mono rounded-xl bg-gray-50 dark:bg-gray-800 p-2.5 border border-gray-200 dark:border-gray-700 text-purple-600 dark:text-purple-300"
                  />
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(summary.affiliate?.link || '', 'host')}
                    className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 font-bold"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="text-xs uppercase text-gray-400 font-bold">Clicks Tracked</div>
                <div className="text-xl font-bold mt-1">{summary.affiliate.clicksCount ?? 0}</div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="text-xs uppercase text-gray-400 font-bold">Bookings Converted</div>
                <div className="text-xl font-bold mt-1 text-emerald-500">{summary.affiliate.conversionsCount ?? 0}</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* How It Works Walkthrough */}
        <section aria-labelledby="how-it-works" className="space-y-4">
          <h2 id="how-it-works" className="text-xl sm:text-2xl font-bold">
            How The Referral Program Works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item, index) => (
              <li key={item.step} className="relative">
                <div className="h-full rounded-2xl border border-[#51372B]/15 bg-white p-5 dark:bg-gray-900 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#193F25] text-base font-black text-[#FAF3EA] dark:bg-emerald-500 dark:text-black">
                      {item.step}
                    </span>
                    <h3 className="mt-3 font-bold text-base">{item.title}</h3>
                    <p className="mt-1 text-sm text-[#51372B]/80 dark:text-gray-300">{item.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Benefits & Terms FAQ Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[#51372B]/15 bg-white p-5 dark:bg-gray-900 dark:border-gray-800 shadow-sm"
            >
              <h3 className="font-bold text-base text-[#193F25] dark:text-emerald-400 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-[#51372B]/80 dark:text-gray-300">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
