'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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

const steps = [
  {
    step: '1',
    title: 'Share your link',
    body: 'Tap Refer a host and send your link to someone who wants to list or stay.',
  },
  {
    step: '2',
    title: 'They join',
    body: 'They create an account with your link or code. They cannot use their own code.',
  },
  {
    step: '3',
    title: 'They complete a stay',
    body: `On their first booking they get ${money(config.friendServiceFeeDiscountUsd)} off the guest service fee. Rent, cleaning, and taxes stay the same.`,
  },
  {
    step: '4',
    title: 'You get credits',
    body: `After checkout, if the stay is not cancelled or refunded, you receive ${config.referralRewardCredits} credits.`,
  },
];

export default function ReferAHostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const referHost = async () => {
    if (!user) {
      router.push('/login?next=/referrals');
      return;
    }
    setBusy(true);
    setNote('');
    try {
      const res = await fetch('/api/referrals/me', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      const link = typeof data?.link === 'string' ? data.link : '';
      if (!data?.enabled || !link) {
        setNote('Your referral link appears here when the program is turned on for this site.');
        return;
      }
      const shareText = `Join VibesBNB with my referral link. You get ${money(config.friendServiceFeeDiscountUsd)} off the guest service fee on your first booking.`;
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'Refer a host', text: shareText, url: link });
          setNote('Referral link ready to send.');
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(link);
      setNote('Referral link copied. Send it to a host.');
    } catch {
      setNote('Sign in again, then tap Refer a host to copy your link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#51372B] py-12 dark:bg-gray-950 dark:text-white">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link href="/profile" className="text-sm font-semibold text-[#193F25] hover:underline dark:text-emerald-400">
          Back to account
        </Link>
        <h1 className="text-3xl font-bold mt-4">Refer a host</h1>
        <p className="mt-3 text-[#51372B]/80 dark:text-gray-300">
          Share your link with a host or a guest. When they join and complete a first stay, you both get the referral benefit.
        </p>
        <button
          type="button"
          onClick={() => void referHost()}
          disabled={busy}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#193F25] px-6 py-3 text-sm font-semibold text-[#FAF3EA] hover:bg-[#142e1b] disabled:opacity-60 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400"
        >
          {busy ? 'Preparing your link…' : 'Refer a host'}
        </button>
        {note ? <p className="mt-3 text-sm font-medium text-[#193F25] dark:text-emerald-300">{note}</p> : null}

        <section className="mt-10" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="text-xl font-bold">
            How it works
          </h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-4">
            {steps.map((item, index) => (
              <li key={item.step} className="relative">
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-[1.35rem] top-10 hidden h-px w-[calc(100%+1rem)] bg-[#193F25]/25 md:block dark:bg-emerald-400/40"
                  />
                ) : null}
                <div className="relative h-full rounded-2xl border border-[#51372B]/15 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#193F25] text-lg font-bold text-[#FAF3EA] dark:bg-emerald-500 dark:text-black">
                      {item.step}
                    </span>
                    {index < steps.length - 1 ? (
                      <span aria-hidden className="text-lg text-[#193F25]/40 md:hidden dark:text-emerald-400/70">
                        ↓
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#51372B]/80 dark:text-gray-300">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <ul className="mt-10 space-y-4">
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
