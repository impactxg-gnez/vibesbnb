'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isReferralAffiliateEnabledClient } from '@/lib/referrals/config';
import { Copy, Check, Users, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

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
  affiliate?: {
    code: string;
    link: string;
    commissionEarned: number;
    status: string;
  } | null;
};

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AccountRewards({ mode = 'all' }: { mode?: 'all' | 'referral' | 'affiliate' }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isReferralAffiliateEnabledClient()) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/referrals/me', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as Summary;
        if (cancelled) return;
        if (data.link) {
          data.link = data.link.replace(/https?:\/\/[^/]*vercel\.app/i, 'https://vibesbnb.com');
        }
        if (data.hostLink) {
          data.hostLink = data.hostLink.replace(/https?:\/\/[^/]*vercel\.app/i, 'https://vibesbnb.com');
        }
        setSummary(data);
      } catch {
        /* account page still works without this module */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReferralAffiliateEnabledClient() || !summary?.enabled) return null;

  const showReferral = mode !== 'affiliate';
  const showAffiliate = mode !== 'referral' && summary.affiliate;
  const linkToShare = summary.hostLink || summary.link || '';

  const copyLink = async () => {
    if (!linkToShare) return;
    try {
      await navigator.clipboard.writeText(linkToShare);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <section className="mb-8 space-y-4">
      {showReferral ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Refer a Host or Friend</h2>
              <p className="text-sm text-gray-400 mt-1">
                Your friend gets {money(summary.friendDiscountUsd || 0)} off their first booking service fee.
                You get {summary.rewardCredits || 0} credits ({money(summary.rewardCredits || 0)}) after their stay completes.
              </p>
            </div>
            <Link
              href="/referrals"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl btn-forest-solid font-semibold text-xs transition-colors shrink-0 shadow-sm"
            >
              <Users className="w-4 h-4" />
              Referral Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 font-medium uppercase">Credits Balance</span>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">
                {money(summary.creditBalance || 0)}
              </div>
            </div>
            <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 font-medium uppercase">People Invited</span>
              <div className="text-xl font-bold text-white mt-0.5">
                {summary.stats?.totalInvited ?? 0}
              </div>
            </div>
            <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 font-medium uppercase">Stays Completed</span>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">
                {summary.stats?.completedStays ?? 0}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-gray-400">Your link: </span>
              <span className="text-emerald-300 font-mono text-xs break-all">{linkToShare || 'Loading…'}</span>
            </div>
            {linkToShare ? (
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-forest-solid text-xs font-semibold transition-colors shrink-0 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showAffiliate ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Affiliate Link</h2>
            <Link href="/affiliates" className="text-xs text-purple-400 hover:underline">
              Affiliate Details →
            </Link>
          </div>
          <p className="text-purple-300 break-all text-sm mt-2">{summary.affiliate?.link}</p>
          <div className="mt-3 flex items-center gap-6 text-sm">
            <span className="text-gray-400">
              Code: <strong className="text-white">{summary.affiliate?.code}</strong>
            </span>
            <span className="text-gray-400">
              Commission Earned: <strong className="text-emerald-400">{money(summary.affiliate?.commissionEarned || 0)}</strong>
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
