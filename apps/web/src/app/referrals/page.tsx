'use client';

import Link from 'next/link';
import { referralAffiliateConfig as config } from '@/lib/referrals/config';
import { AccountRewards } from '@/components/referrals/AccountRewards';

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const benefits = [
  {
    title: 'You earn credits after their stay',
    body: `You receive ${config.referralRewardCredits} credits once their first stay is complete, the checkout date has passed, and the booking was not cancelled or refunded.`,
  },
  {
    title: 'Credits spend like dollars on your service fee',
    body: `1 credit equals ${money(config.creditValueUsd)}. Credits apply to the guest service fee on your next booking. They never reduce rent, cleaning, or taxes.`,
  },
  {
    title: 'They save on their first booking',
    body: `The person you refer gets ${money(config.friendServiceFeeDiscountUsd)} off the guest service fee on their first booking only.`,
  },
  {
    title: 'Credits stay on your account',
    body: `Credits last ${config.creditExpiryMonths} months, have no cash value, and cannot be transferred. The oldest credits are used first.`,
  },
  {
    title: 'One reward per person',
    body: 'Each new guest can earn you one reward, and only for their first completed stay. You cannot use your own code.',
  },
];

export default function ReferAHostPage() {
  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#51372B] py-12 dark:bg-gray-950 dark:text-white">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/profile" className="text-sm font-semibold text-[#193F25] hover:underline dark:text-emerald-400">
          Back to account
        </Link>
        <h1 className="text-3xl font-bold mt-4">Refer a host</h1>
        <p className="mt-3 text-[#51372B]/80 dark:text-gray-300">
          Share your link with a host or a guest. When they join and complete a first stay, you both get the referral benefit.
        </p>

        <ul className="mt-8 space-y-4">
          {benefits.map((item) => (
            <li key={item.title} className="rounded-2xl border border-[#51372B]/15 bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-[#51372B]/80 dark:text-gray-300">{item.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <AccountRewards mode="referral" />
        </div>
      </div>
    </div>
  );
}
