/**
 * Referral + affiliate v1 numbers.
 * Change this file to retune the program. Do not copy these values into logic.
 * The program is on unless the environment flags are set to false.
 */
export const referralAffiliateConfig = {
  /** 1 credit = $1. Credits have no cash value and cannot be transferred. */
  creditValueUsd: 1,
  /** Credits granted to the referrer after the friend's stay is complete. */
  referralRewardCredits: 25,
  /** Dollars off the guest service fee for the friend's first booking. */
  friendServiceFeeDiscountUsd: 25,
  /** Credit lifetime from the day they are issued. */
  creditExpiryMonths: 12,
  /** Affiliate commission rate applied to rent only. */
  affiliateCommissionRate: 0.05,
  /** Maximum affiliate commission on a single booking. */
  affiliateCommissionCapUsd: 100,
  /** Last affiliate click inside this many days wins the booking. */
  affiliateTrackingWindowDays: 30,
  /** Unpaid commission must reach this before a payout row is created. */
  affiliateMinimumPayoutUsd: 50,
  /** Payout cadence label for admin. Payouts are manual in v1. */
  affiliatePayoutCadence: 'monthly' as const,
  /** Commission becomes payable only after the stay is complete. */
  affiliatePayoutAfter: 'stay_complete' as const,
} as const;

export type ReferralAffiliateConfig = typeof referralAffiliateConfig;

function envOff(value: string | undefined): boolean {
  const v = (value || '').trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'off' || v === 'no';
}

/**
 * On unless an environment explicitly turns it off.
 * Set REFERRAL_AFFILIATE_ENABLED=false and
 * NEXT_PUBLIC_REFERRAL_AFFILIATE_ENABLED=false to disable.
 */
export function isReferralAffiliateEnabled(): boolean {
  return (
    !envOff(process.env.REFERRAL_AFFILIATE_ENABLED) &&
    !envOff(process.env.NEXT_PUBLIC_REFERRAL_AFFILIATE_ENABLED)
  );
}

/** Client flag. On unless NEXT_PUBLIC_REFERRAL_AFFILIATE_ENABLED is false. */
export function isReferralAffiliateEnabledClient(): boolean {
  return !envOff(process.env.NEXT_PUBLIC_REFERRAL_AFFILIATE_ENABLED);
}

export const REFERRAL_CODE_COOKIE = 'vbn_referral_code';
export const AFFILIATE_CLICK_COOKIE = 'vbn_affiliate_click';

export const CANONICAL_APP_URL = 'https://vibesbnb.com';

function isVercelHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'vercel.app' || host.endsWith('.vercel.app');
}

export function appOrigin(overrideOrigin?: string | null): string {
  if (overrideOrigin) {
    try {
      const u = new URL(overrideOrigin);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return overrideOrigin.replace(/\/$/, '');
      }
      if (isVercelHost(u.hostname)) return CANONICAL_APP_URL;
      return overrideOrigin.replace(/\/$/, '');
    } catch {
      /* ignore invalid override */
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    try {
      const u = new URL(origin);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return origin;
      if (isVercelHost(u.hostname)) return CANONICAL_APP_URL;
      return origin;
    } catch {
      // fallback
    }
  }

  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (!raw) {
    if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
    return CANONICAL_APP_URL;
  }
  try {
    const u = new URL(raw);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return raw;
    if (isVercelHost(u.hostname)) return CANONICAL_APP_URL;
    return raw;
  } catch {
    return CANONICAL_APP_URL;
  }
}

export function referralLinkForCode(code: string, origin?: string | null): string {
  return `${appOrigin(origin)}/r/${encodeURIComponent(code)}`;
}

export function hostReferralLinkForCode(code: string, origin?: string | null): string {
  return `${referralLinkForCode(code, origin)}?type=host`;
}

export function affiliateLinkForCode(code: string, origin?: string | null): string {
  return `${appOrigin(origin)}/a/${encodeURIComponent(code)}`;
}
