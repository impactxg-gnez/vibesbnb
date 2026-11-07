'use client';

import { useEffect, useState } from 'react';
import { isReferralAffiliateEnabledClient } from '@/lib/referrals/config';

type Summary = {
  enabled: boolean;
  code?: string;
  link?: string;
  creditBalance?: number;
  rewardCredits?: number;
  friendDiscountUsd?: number;
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

  useEffect(() => {
    if (!isReferralAffiliateEnabledClient()) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/referrals/me', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as Summary;
        if (!cancelled) setSummary(data);
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

  return (
    <section className="mb-8 space-y-4">
      {showReferral ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white">Invite a friend</h2>
          <p className="text-sm text-gray-400 mt-1">
            Your friend gets {money(summary.friendDiscountUsd || 0)} off the guest service fee on their
            first booking. You get {summary.rewardCredits || 0} credits after their stay is complete.
            Credits are {money(1)} each, expire in 12 months, and are not cash.
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">Your referral link</p>
            <p className="text-emerald-300 break-all text-sm">{summary.link || 'Loading…'}</p>
            <p className="text-sm text-gray-300">
              Code <span className="font-semibold text-white">{summary.code || '—'}</span>
            </p>
            <p className="text-sm text-white">
              Your credits balance:{' '}
              <span className="font-semibold">{money(summary.creditBalance || 0)}</span>
            </p>
          </div>
        </div>
      ) : null}

      {showAffiliate ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white">Your affiliate link</h2>
          <p className="text-emerald-300 break-all text-sm mt-2">{summary.affiliate?.link}</p>
          <p className="text-sm text-gray-300 mt-2">
            Code <span className="font-semibold text-white">{summary.affiliate?.code}</span>
          </p>
          <p className="text-sm text-white mt-2">
            Commission earned:{' '}
            <span className="font-semibold">{money(summary.affiliate?.commissionEarned || 0)}</span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
