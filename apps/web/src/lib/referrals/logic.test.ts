import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { referralAffiliateConfig as config } from './config';
import {
  affiliateCommissionForBooking,
  applyCreditsFifo,
  applyServiceFeeAdjustment,
  attributeLastClick,
  availableCreditBalance,
  canOpenPayout,
  commissionForRent,
  creditExpiresAt,
  restoreCreditsFifo,
  rewardCreditsForCompletedStay,
  withinTrackingWindow,
} from './logic';

const day = 24 * 60 * 60 * 1000;

describe('referral affiliate config is the v1 brief', () => {
  it('locks the published numbers in the config file', () => {
    assert.equal(config.creditValueUsd, 1);
    assert.equal(config.referralRewardCredits, 25);
    assert.equal(config.friendServiceFeeDiscountUsd, 25);
    assert.equal(config.creditExpiryMonths, 12);
    assert.equal(config.affiliateCommissionRate, 0.05);
    assert.equal(config.affiliateCommissionCapUsd, 100);
    assert.equal(config.affiliateTrackingWindowDays, 30);
    assert.equal(config.affiliateMinimumPayoutUsd, 50);
  });
});

describe('acceptance', () => {
  it('1. flag off leaves the total and the service fee unchanged', () => {
    const result = applyServiceFeeAdjustment({
      enabled: false,
      serviceFee: 30,
      grandTotal: 400,
      rent: 300,
      cleaningFee: 75,
      friendEligible: true,
      creditBalance: 25,
    });
    assert.equal(result.guestDue, 400);
    assert.equal(result.serviceFeeAfter, 30);
    assert.equal(result.creditsApplied, 0);
    assert.equal(result.friendDiscount, 0);
    assert.equal(result.showCreditLine, false);
    assert.equal(result.rent, 300);
    assert.equal(result.cleaningFee, 75);
  });

  it('2. flag on with no referral and no credits matches today', () => {
    const result = applyServiceFeeAdjustment({
      enabled: true,
      serviceFee: 30,
      grandTotal: 400,
      rent: 300,
      cleaningFee: 75,
      friendEligible: false,
      creditBalance: 0,
    });
    assert.equal(result.guestDue, 400);
    assert.equal(result.serviceFeeAfter, 30);
    assert.equal(result.showCreditLine, false);
    assert.equal(result.rent, 300);
    assert.equal(result.cleaningFee, 75);
  });

  it('3. friend first booking takes the offer off the service fee, referrer is paid after the stay', () => {
    const friend = applyServiceFeeAdjustment({
      enabled: true,
      serviceFee: 40,
      grandTotal: 500,
      rent: 360,
      cleaningFee: 80,
      friendEligible: true,
      creditBalance: 0,
    });
    assert.equal(friend.friendDiscount, config.friendServiceFeeDiscountUsd);
    assert.equal(friend.serviceFeeAfter, 15);
    assert.equal(friend.guestDue, 475);
    assert.equal(friend.rent, 360);
    assert.equal(friend.cleaningFee, 80);
    assert.equal(friend.showCreditLine, false);

    const reward = rewardCreditsForCompletedStay({
      cancelledOrRefunded: false,
      checkoutPassed: true,
      alreadyRewarded: false,
      paid: true,
    });
    assert.equal(reward, 25);
    assert.equal(
      rewardCreditsForCompletedStay({
        cancelledOrRefunded: false,
        checkoutPassed: true,
        alreadyRewarded: true,
        paid: true,
      }),
      0
    );
  });

  it('4. $30 service fee and 25 credits becomes a $5 fee; rent and cleaning stay put', () => {
    const result = applyServiceFeeAdjustment({
      enabled: true,
      serviceFee: 30,
      grandTotal: 405,
      rent: 300,
      cleaningFee: 50,
      friendEligible: false,
      creditBalance: 25,
    });
    assert.equal(result.serviceFeeAfter, 5);
    assert.equal(result.creditsApplied, 25);
    assert.equal(result.guestDue, 380);
    assert.equal(result.rent, 300);
    assert.equal(result.cleaningFee, 50);
    assert.equal(result.showCreditLine, true);
  });

  it('5. $20 service fee uses 20 credits and leaves 5', () => {
    const result = applyServiceFeeAdjustment({
      enabled: true,
      serviceFee: 20,
      grandTotal: 280,
      rent: 200,
      cleaningFee: 40,
      friendEligible: false,
      creditBalance: 25,
    });
    assert.equal(result.serviceFeeAfter, 0);
    assert.equal(result.creditsApplied, 20);
    assert.equal(result.creditsRemaining, 5);
    assert.equal(result.rent, 200);
    assert.equal(result.cleaningFee, 40);
    assert.equal(result.guestDue, 260);
  });

  it('6. a cancelled stay issues no credits and no commission', () => {
    assert.equal(
      rewardCreditsForCompletedStay({
        cancelledOrRefunded: true,
        checkoutPassed: false,
        alreadyRewarded: false,
        paid: false,
      }),
      0
    );
    const booked = new Date('2026-06-01T00:00:00Z');
    assert.equal(
      affiliateCommissionForBooking({
        rent: 450,
        clickedAt: new Date(booked.getTime() - day),
        bookedAt: booked,
        selfBooking: false,
        cancelledOrRefunded: true,
        checkoutPassed: false,
      }),
      0
    );
  });

  it('7. $450 rent inside the window pays $22.50 after the stay', () => {
    const booked = new Date('2026-07-01T00:00:00Z');
    const commission = affiliateCommissionForBooking({
      rent: 450,
      clickedAt: new Date(booked.getTime() - 2 * day),
      bookedAt: booked,
      selfBooking: false,
      cancelledOrRefunded: false,
      checkoutPassed: true,
    });
    assert.equal(commission, 22.5);
    assert.equal(commissionForRent(450), 22.5);
  });

  it('8. a click older than the tracking window pays nothing', () => {
    const booked = new Date('2026-08-01T00:00:00Z');
    const clicked = new Date(booked.getTime() - 31 * day);
    assert.equal(withinTrackingWindow(clicked, booked), false);
    assert.equal(
      affiliateCommissionForBooking({
        rent: 450,
        clickedAt: clicked,
        bookedAt: booked,
        selfBooking: false,
        cancelledOrRefunded: false,
        checkoutPassed: true,
      }),
      0
    );
  });

  it('9. commission on $3,000 rent is capped', () => {
    assert.equal(commissionForRent(3000), config.affiliateCommissionCapUsd);
    assert.equal(commissionForRent(3000), 100);
  });

  it('10. an affiliate booking their own link earns nothing', () => {
    const booked = new Date('2026-09-01T00:00:00Z');
    assert.equal(
      affiliateCommissionForBooking({
        rent: 450,
        clickedAt: new Date(booked.getTime() - day),
        bookedAt: booked,
        selfBooking: true,
        cancelledOrRefunded: false,
        checkoutPassed: true,
      }),
      0
    );
  });

  it('11. turning the flag off again ignores credits', () => {
    const result = applyServiceFeeAdjustment({
      enabled: false,
      serviceFee: 20,
      grandTotal: 280,
      rent: 200,
      cleaningFee: 40,
      friendEligible: true,
      creditBalance: 25,
    });
    assert.equal(result.enabled, false);
    assert.equal(result.guestDue, 280);
    assert.equal(result.serviceFeeAfter, 20);
    assert.equal(result.showCreditLine, false);
  });
});

describe('credits', () => {
  it('spends the oldest lot first and restores in reverse', () => {
    const now = new Date('2026-01-15T00:00:00Z');
    const lots = [
      {
        id: 'b',
        amount: 10,
        usedAmount: 0,
        expiresAt: '2026-12-01T00:00:00Z',
        status: 'available',
      },
      {
        id: 'a',
        amount: 25,
        usedAmount: 0,
        expiresAt: '2026-06-01T00:00:00Z',
        status: 'available',
      },
      {
        id: 'old',
        amount: 10,
        usedAmount: 0,
        expiresAt: '2025-01-01T00:00:00Z',
        status: 'available',
      },
    ];
    assert.equal(availableCreditBalance(lots, now), 35);
    const spent = applyCreditsFifo(lots, 30, now);
    assert.equal(spent.applied, 30);
    const a = spent.lots.find((lot) => lot.id === 'a');
    const b = spent.lots.find((lot) => lot.id === 'b');
    assert.equal(a?.status, 'used');
    assert.equal(a?.usedAmount, 25);
    assert.equal(b?.usedAmount, 5);
    assert.equal(b?.status, 'available');
    const restored = restoreCreditsFifo(spent.lots, 30, now);
    assert.equal(availableCreditBalance(restored, now), 35);
  });

  it('expires credits on the config horizon', () => {
    const issued = new Date('2026-01-01T00:00:00Z');
    const expires = new Date(creditExpiresAt(issued));
    assert.equal(expires.getUTCFullYear(), 2027);
    assert.equal(expires.getUTCMonth(), 0);
  });

  it('last click inside the window wins', () => {
    const booked = new Date('2026-05-20T00:00:00Z');
    const winner = attributeLastClick(
      [
        { affiliateId: 'old', clickedAt: new Date(booked.getTime() - 10 * day) },
        { affiliateId: 'new', clickedAt: new Date(booked.getTime() - 1 * day) },
        { affiliateId: 'stale', clickedAt: new Date(booked.getTime() - 40 * day) },
      ],
      booked
    );
    assert.equal(winner, 'new');
  });

  it('does not open a payout under the minimum', () => {
    assert.equal(canOpenPayout(22.5), false);
    assert.equal(canOpenPayout(config.affiliateMinimumPayoutUsd), true);
  });
});
