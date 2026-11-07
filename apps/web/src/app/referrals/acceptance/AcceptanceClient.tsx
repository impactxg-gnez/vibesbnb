'use client';

import { referralAffiliateConfig as config } from '@/lib/referrals/config';
import {
  affiliateCommissionForBooking,
  applyServiceFeeAdjustment,
  rewardCreditsForCompletedStay,
} from '@/lib/referrals/logic';

const day = 24 * 60 * 60 * 1000;

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function AcceptanceClient() {
  const friend = applyServiceFeeAdjustment({
    enabled: true,
    serviceFee: 40,
    grandTotal: 500,
    rent: 360,
    cleaningFee: 80,
    friendEligible: true,
    creditBalance: 0,
  });
  const reward = rewardCreditsForCompletedStay({
    cancelledOrRefunded: false,
    checkoutPassed: true,
    alreadyRewarded: false,
    paid: true,
  });
  const thirty = applyServiceFeeAdjustment({
    enabled: true,
    serviceFee: 30,
    grandTotal: 405,
    rent: 300,
    cleaningFee: 50,
    friendEligible: false,
    creditBalance: config.referralRewardCredits,
  });
  const booked = new Date('2026-07-01T00:00:00.000Z');
  const commission = affiliateCommissionForBooking({
    rent: 450,
    clickedAt: new Date(booked.getTime() - 2 * day),
    bookedAt: booked,
    selfBooking: false,
    cancelledOrRefunded: false,
    checkoutPassed: true,
  });

  const rows = [
    {
      name: 'Test 3 — friend offer and referrer credits',
      pass: friend.friendDiscount === 25 && friend.rent === 360 && friend.cleaningFee === 80 && reward === 25,
      detail: `Friend service fee ${money(40)} → ${money(friend.serviceFeeAfter)} (${money(friend.friendDiscount)} off). Rent ${money(friend.rent)}, cleaning ${money(friend.cleaningFee)}. Referrer receives ${reward} credits after the stay.`,
    },
    {
      name: 'Test 4 — 25 credits on a $30 service fee',
      pass: thirty.serviceFeeAfter === 5 && thirty.creditsApplied === 25 && thirty.rent === 300 && thirty.cleaningFee === 50 && thirty.showCreditLine,
      detail: `Referral credits applied: -${money(thirty.creditsApplied)}. Service fee ${money(30)} → ${money(thirty.serviceFeeAfter)}. Rent ${money(thirty.rent)}, cleaning ${money(thirty.cleaningFee)}.`,
    },
    {
      name: 'Test 7 — affiliate commission on $450 rent',
      pass: commission === 22.5,
      detail: `Click inside ${config.affiliateTrackingWindowDays} days, stay complete, rent ${money(450)}. Commission ${money(commission)} (${config.affiliateCommissionRate * 100}% of rent, cap ${money(config.affiliateCommissionCapUsd)}). Guest price is unchanged.`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12">
      <div className="max-w-3xl mx-auto px-4 space-y-4">
        <h1 className="text-3xl font-bold">Referral and affiliate acceptance</h1>
        <p className="text-gray-400 text-sm">
          These three checks use the staging config. The guest total, rent, cleaning, and tax
          formulas are not rewritten here.
        </p>
        {rows.map((row) => (
          <article key={row.name} className="border border-gray-800 rounded-xl p-5 bg-gray-900">
            <p className="text-sm uppercase tracking-wide text-emerald-400">
              {row.pass ? 'Pass' : 'Fail'}
            </p>
            <h2 className="text-xl font-semibold mt-1">{row.name}</h2>
            <p className="text-gray-300 mt-2">{row.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
