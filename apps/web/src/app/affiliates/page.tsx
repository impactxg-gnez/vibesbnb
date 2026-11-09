'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountRewards } from '@/components/referrals/AccountRewards';
import { isReferralAffiliateEnabledClient } from '@/lib/referrals/config';

export default function AffiliatesPage() {
  if (!isReferralAffiliateEnabledClient()) {
    notFound();
  }
  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/profile" className="text-sm text-emerald-400 hover:text-emerald-300">
          Back to account
        </Link>
        <h1 className="text-3xl font-bold text-white mt-4 mb-2">Affiliates</h1>
        <p className="text-sm text-gray-400 mb-6">
          Affiliate partner links are created by VibesBNB. To invite hosts and earn booking credits, use the{' '}
          <Link href="/referrals" className="text-emerald-400 hover:underline font-semibold">
            Referral & Invite Dashboard →
          </Link>
        </p>
        <AccountRewards mode="affiliate" />
      </div>
    </div>
  );
}
