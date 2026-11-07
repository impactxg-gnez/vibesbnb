import { createHash, randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import {
  affiliateLinkForCode,
  isReferralAffiliateEnabled,
  referralAffiliateConfig as config,
  referralLinkForCode,
} from '@/lib/referrals/config';
import {
  affiliateCommissionForBooking,
  applyCreditsFifo,
  applyServiceFeeAdjustment,
  availableCreditBalance,
  canOpenPayout,
  checkoutDatePassed,
  creditExpiresAt,
  isCancelledOrRefunded,
  normalizeCode,
  normalizeEmail,
  payoutPeriod,
  restoreCreditsFifo,
  rewardCreditsForCompletedStay,
  roundMoney,
  type CreditLot,
} from '@/lib/referrals/logic';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACTIVE_BOOKING_SKIP = new Set(['cancelled', 'rejected']);

function db() {
  return createServiceClient();
}

function quiet(error: { message?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = error.message || '';
  return /relation .* does not exist|schema cache/i.test(message);
}

function makeCode(): string {
  const bytes = randomBytes(8);
  let out = '';
  for (const byte of bytes) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return out;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`vibesbnb-affiliate|${ip}`).digest('hex');
}

export function parseAffiliateCookie(raw: string | undefined | null): {
  affiliateId: string;
  clickedAt: Date;
} | null {
  if (!raw) return null;
  const [id, stamp] = raw.split('.');
  if (!id || !stamp) return null;
  const clickedAt = new Date(Number(stamp));
  if (!id || Number.isNaN(clickedAt.getTime())) return null;
  return { affiliateId: id, clickedAt };
}

type CreditRow = {
  id: string;
  user_id: string;
  amount: number | string;
  source_referral_id: string | null;
  expires_at: string;
  used_amount: number | string;
  status: string;
};

function toLot(row: CreditRow): CreditLot {
  return {
    id: row.id,
    amount: Number(row.amount) || 0,
    usedAmount: Number(row.used_amount) || 0,
    expiresAt: row.expires_at,
    status: row.status,
  };
}

async function loadCreditRows(supabase: SupabaseClient, userId: string): Promise<CreditRow[]> {
  const { data, error } = await supabase
    .from('referral_credits')
    .select('id, user_id, amount, source_referral_id, expires_at, used_amount, status')
    .eq('user_id', userId);
  if (error) {
    if (quiet(error)) return [];
    throw error;
  }
  return (data || []) as CreditRow[];
}

async function persistLots(supabase: SupabaseClient, before: CreditRow[], after: CreditLot[]) {
  for (const lot of after) {
    const prev = before.find((row) => row.id === lot.id);
    if (!prev) continue;
    if (
      Number(prev.used_amount) === lot.usedAmount &&
      prev.status === lot.status &&
      Number(prev.amount) === lot.amount
    ) {
      continue;
    }
    const { error } = await supabase
      .from('referral_credits')
      .update({
        used_amount: lot.usedAmount,
        status: lot.status,
        amount: lot.amount,
      })
      .eq('id', lot.id);
    if (error) throw error;
  }
}

export async function ensureReferralLink(userId: string): Promise<{ code: string; link: string } | null> {
  if (!isReferralAffiliateEnabled()) return null;
  const supabase = db();
  const { data: existing, error } = await supabase
    .from('referrals')
    .select('code')
    .eq('referrer_user_id', userId)
    .is('referred_user_id', null)
    .maybeSingle();
  if (error) {
    if (quiet(error)) return null;
    throw error;
  }
  if (existing?.code) {
    return { code: existing.code, link: referralLinkForCode(existing.code) };
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode();
    const { error: insertError } = await supabase.from('referrals').insert({
      referrer_user_id: userId,
      referred_user_id: null,
      code,
      status: 'link',
      booking_id: null,
    });
    if (!insertError) return { code, link: referralLinkForCode(code) };
    if (!/duplicate|unique/i.test(insertError.message || '')) {
      if (quiet(insertError)) return null;
      throw insertError;
    }
  }
  return null;
}

async function referrerEmail(supabase: SupabaseClient, userId: string): Promise<string> {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    return normalizeEmail(data.user?.email);
  } catch {
    return '';
  }
}

export async function claimReferralCode(params: {
  userId: string;
  email: string;
  code: string;
  createdAt?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!isReferralAffiliateEnabled()) return { ok: false, reason: 'disabled' };
  const code = normalizeCode(params.code);
  if (!code) return { ok: false, reason: 'empty' };

  const created = params.createdAt ? new Date(params.createdAt).getTime() : Date.now();
  const ageMs = Date.now() - created;
  if (Number.isFinite(ageMs) && ageMs > 7 * 24 * 60 * 60 * 1000) {
    return { ok: false, reason: 'not_new' };
  }

  const supabase = db();
  const { data: already } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_user_id', params.userId)
    .maybeSingle();
  if (already?.id) return { ok: false, reason: 'already_referred' };

  const { data: link } = await supabase
    .from('referrals')
    .select('referrer_user_id, code')
    .eq('code', code)
    .is('referred_user_id', null)
    .eq('status', 'link')
    .maybeSingle();
  if (!link?.referrer_user_id) return { ok: false, reason: 'unknown_code' };
  if (String(link.referrer_user_id) === String(params.userId)) {
    return { ok: false, reason: 'self' };
  }
  const ownerEmail = await referrerEmail(supabase, String(link.referrer_user_id));
  if (ownerEmail && ownerEmail === normalizeEmail(params.email)) {
    return { ok: false, reason: 'self' };
  }

  const { error } = await supabase.from('referrals').insert({
    referrer_user_id: link.referrer_user_id,
    referred_user_id: params.userId,
    code,
    status: 'pending',
    booking_id: null,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message || '')) return { ok: false, reason: 'already_referred' };
    if (quiet(error)) return { ok: false, reason: 'unavailable' };
    throw error;
  }
  return { ok: true };
}

async function friendIsEligible(
  supabase: SupabaseClient,
  userId: string,
  exceptBookingId?: string
): Promise<boolean> {
  const { data: referral, error } = await supabase
    .from('referrals')
    .select('id, status')
    .eq('referred_user_id', userId)
    .maybeSingle();
  if (error || !referral) return false;
  if (referral.status === 'void') return false;

  const { data: markers } = await supabase
    .from('referral_credits')
    .select('status')
    .eq('user_id', userId)
    .like('status', 'offer:%');
  if ((markers || []).length > 0) return false;

  const { data: bookings, error: bookingError } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('user_id', userId)
    .limit(50);
  if (bookingError) return false;
  return !(bookings || []).some((row) => {
    if (exceptBookingId && String(row.id) === String(exceptBookingId)) return false;
    return !ACTIVE_BOOKING_SKIP.has(String(row.status || ''));
  });
}

async function balanceOf(supabase: SupabaseClient, userId: string, now = new Date()): Promise<number> {
  const rows = await loadCreditRows(supabase, userId);
  const expired = rows.filter(
    (row) => row.status === 'available' && new Date(row.expires_at).getTime() <= now.getTime()
  );
  for (const row of expired) {
    await supabase.from('referral_credits').update({ status: 'expired' }).eq('id', row.id);
    row.status = 'expired';
  }
  return availableCreditBalance(rows.map(toLot), now);
}

export async function previewAdjustment(userId: string, serviceFee: number) {
  if (!isReferralAffiliateEnabled()) {
    return { enabled: false, creditsApplied: 0, friendDiscount: 0, creditBalance: 0 };
  }
  const supabase = db();
  const [creditBalance, friendEligible] = await Promise.all([
    balanceOf(supabase, userId),
    friendIsEligible(supabase, userId),
  ]);
  const adjustment = applyServiceFeeAdjustment({
    enabled: true,
    serviceFee,
    grandTotal: Math.max(serviceFee, 1),
    rent: 0,
    cleaningFee: 0,
    friendEligible,
    creditBalance,
  });
  return {
    enabled: true,
    creditsApplied: adjustment.creditsApplied,
    friendDiscount: adjustment.friendDiscount,
    creditBalance,
  };
}

export async function getAccountSummary(user: {
  id: string;
  email?: string | null;
  created_at?: string | null;
  user_metadata?: { referral_code?: string };
  cookieCode?: string | null;
}) {
  if (!isReferralAffiliateEnabled()) return { enabled: false as const };
  const link = await ensureReferralLink(user.id);
  const code = normalizeCode(user.user_metadata?.referral_code || user.cookieCode || '');
  if (code) {
    try {
      await claimReferralCode({
        userId: user.id,
        email: user.email || '',
        code,
        createdAt: user.created_at,
      });
    } catch (error) {
      console.warn('[referrals] claim skipped', error);
    }
  }
  try {
    await settleMatureRewards({ userId: user.id });
  } catch (error) {
    console.warn('[referrals] settle skipped', error);
  }
  const supabase = db();
  const creditBalance = await balanceOf(supabase, user.id);
  const affiliate = await affiliateSummaryForEmail(normalizeEmail(user.email));
  return {
    enabled: true as const,
    code: link?.code || '',
    link: link?.link || '',
    creditBalance,
    creditValueUsd: config.creditValueUsd,
    rewardCredits: config.referralRewardCredits,
    friendDiscountUsd: config.friendServiceFeeDiscountUsd,
    affiliate,
  };
}

async function affiliateSummaryForEmail(email: string) {
  if (!email) return null;
  const supabase = db();
  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .select('id, name, code, link, status, email')
    .ilike('email', email)
    .maybeSingle();
  if (error || !affiliate || affiliate.status !== 'active') return null;
  const { data: conversions } = await supabase
    .from('affiliate_conversions')
    .select('commission_amount, status')
    .eq('affiliate_id', affiliate.id);
  const earned = roundMoney(
    (conversions || [])
      .filter((row) => row.status !== 'void')
      .reduce((sum, row) => sum + (Number(row.commission_amount) || 0), 0)
  );
  return {
    code: affiliate.code as string,
    link: (affiliate.link as string) || affiliateLinkForCode(affiliate.code),
    commissionEarned: earned,
    status: affiliate.status as string,
  };
}

export async function attachReferralToNewBooking(params: {
  bookingId: string;
  affiliateCookie: string | null;
  serviceFee: number;
  rent: number;
  cleaningFee: number;
  grandTotal: number;
}): Promise<void> {
  if (!isReferralAffiliateEnabled()) return;
  const supabase = db();
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, user_id, guest_email, total_price, created_at')
    .eq('id', params.bookingId)
    .maybeSingle();
  if (bookingError || !booking) return;
  const quote = {
    platformFee: params.serviceFee,
    totalRent: params.rent,
    cleaningFee: params.cleaningFee,
    grandTotal: params.grandTotal,
  };
  const userId = String(booking.user_id);

  const { data: existingMarkers } = await supabase
    .from('referral_credits')
    .select('status, used_amount')
    .eq('user_id', userId)
    .in('status', [`spent:${params.bookingId}`, `offer:${params.bookingId}`]);
  if ((existingMarkers || []).length > 0) return;

  const creditBalance = await balanceOf(supabase, userId);
  const friendEligible = await friendIsEligible(supabase, userId, params.bookingId);
  const adjustment = applyServiceFeeAdjustment({
    enabled: true,
    serviceFee: quote.platformFee,
    grandTotal: Number(booking.total_price) || quote.grandTotal,
    rent: quote.totalRent,
    cleaningFee: quote.cleaningFee,
    friendEligible,
    creditBalance,
  });

  if (adjustment.creditsApplied > 0) {
    const rows = await loadCreditRows(supabase, userId);
    const spent = applyCreditsFifo(rows.map(toLot), adjustment.creditsApplied, new Date());
    await persistLots(supabase, rows, spent.lots);
    await supabase.from('referral_credits').insert({
      user_id: userId,
      amount: 0,
      source_referral_id: null,
      expires_at: creditExpiresAt(new Date()),
      used_amount: adjustment.creditsApplied,
      status: `spent:${params.bookingId}`,
    });
  }

  if (adjustment.friendDiscount > 0) {
    const { data: referral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', userId)
      .maybeSingle();
    await supabase.from('referral_credits').insert({
      user_id: userId,
      amount: 0,
      source_referral_id: referral?.id || null,
      expires_at: creditExpiresAt(new Date()),
      used_amount: adjustment.friendDiscount,
      status: `offer:${params.bookingId}`,
    });
  }

  if (friendEligible || adjustment.friendDiscount > 0) {
    await supabase
      .from('referrals')
      .update({ booking_id: params.bookingId })
      .eq('referred_user_id', userId)
      .eq('status', 'pending')
      .is('booking_id', null);
  }

  await attributeAffiliate(supabase, {
    bookingId: params.bookingId,
    guestEmail: normalizeEmail(booking.guest_email),
    rent: quote.totalRent,
    bookedAt: new Date(booking.created_at || Date.now()),
    cookie: params.affiliateCookie,
  });
}

async function attributeAffiliate(
  supabase: SupabaseClient,
  params: {
    bookingId: string;
    guestEmail: string;
    rent: number;
    bookedAt: Date;
    cookie: string | null;
  }
) {
  const parsed = parseAffiliateCookie(params.cookie);
  if (!parsed) return;
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, email, status')
    .eq('id', parsed.affiliateId)
    .maybeSingle();
  if (!affiliate || affiliate.status !== 'active') return;
  const selfBooking = normalizeEmail(affiliate.email) === params.guestEmail && params.guestEmail !== '';
  const commission = affiliateCommissionForBooking({
    rent: params.rent,
    clickedAt: parsed.clickedAt,
    bookedAt: params.bookedAt,
    selfBooking,
    cancelledOrRefunded: false,
    checkoutPassed: true,
  });
  // checkoutPassed is forced true here so the window/self checks run.
  // The row stays pending until the stay actually completes, and a
  // self-booking or a stale click stores a zero commission void row? Spec
  // wants $0, so we simply do not insert a payable conversion.
  if (selfBooking || commission <= 0) return;
  const { error } = await supabase.from('affiliate_conversions').insert({
    affiliate_id: affiliate.id,
    booking_id: params.bookingId,
    rent_amount: roundMoney(params.rent),
    commission_amount: commission,
    status: 'pending',
    stay_completed_at: null,
  });
  if (error && !/duplicate|unique/i.test(error.message || '') && !quiet(error)) {
    throw error;
  }
}

export async function guestChargeAmount(bookingId: string, bookingTotal: number): Promise<number> {
  const total = Number(bookingTotal);
  if (!isReferralAffiliateEnabled()) return total;
  try {
    const supabase = db();
    const { data, error } = await supabase
      .from('referral_credits')
      .select('used_amount, status')
      .in('status', [`spent:${bookingId}`, `offer:${bookingId}`]);
    if (error || !data) return total;
    const off = roundMoney(data.reduce((sum, row) => sum + (Number(row.used_amount) || 0), 0));
    if (off <= 0) return total;
    return roundMoney(Math.max(0, total - off));
  } catch (error) {
    console.warn('[referrals] charge lookup skipped', error);
    return total;
  }
}

export async function adjustmentForBooking(bookingId: string): Promise<{
  enabled: boolean;
  creditsApplied: number;
  friendDiscount: number;
}> {
  if (!isReferralAffiliateEnabled()) {
    return { enabled: false, creditsApplied: 0, friendDiscount: 0 };
  }
  const supabase = db();
  const { data, error } = await supabase
    .from('referral_credits')
    .select('used_amount, status')
    .in('status', [`spent:${bookingId}`, `offer:${bookingId}`]);
  if (error || !data) return { enabled: true, creditsApplied: 0, friendDiscount: 0 };
  let creditsApplied = 0;
  let friendDiscount = 0;
  for (const row of data) {
    const amount = Number(row.used_amount) || 0;
    if (String(row.status).startsWith('spent:')) creditsApplied += amount;
    if (String(row.status).startsWith('offer:')) friendDiscount += amount;
  }
  return {
    enabled: true,
    creditsApplied: roundMoney(creditsApplied),
    friendDiscount: roundMoney(friendDiscount),
  };
}

export async function onBookingCancelledOrRefunded(bookingId: string): Promise<void> {
  if (!isReferralAffiliateEnabled()) return;
  const supabase = db();
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, user_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return;
  const userId = String(booking.user_id);
  const rows = await loadCreditRows(supabase, userId);
  const spent = rows.find((row) => row.status === `spent:${bookingId}`);
  if (spent) {
    const restored = restoreCreditsFifo(rows.map(toLot), Number(spent.used_amount) || 0, new Date());
    await persistLots(supabase, rows, restored);
    await supabase.from('referral_credits').update({ status: 'void' }).eq('id', spent.id);
  }
  await supabase
    .from('referral_credits')
    .update({ status: 'void' })
    .eq('status', `offer:${bookingId}`);

  const { data: referral } = await supabase
    .from('referrals')
    .select('id, status, booking_id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (referral && referral.status === 'pending') {
    await supabase
      .from('referrals')
      .update({ booking_id: null, status: 'pending' })
      .eq('id', referral.id);
  }
  if (referral && referral.status === 'completed') {
    const { data: grants } = await supabase
      .from('referral_credits')
      .select('id, amount, used_amount, status')
      .eq('source_referral_id', referral.id)
      .in('status', ['available', 'used']);
    for (const grant of grants || []) {
      const used = Number(grant.used_amount) || 0;
      await supabase
        .from('referral_credits')
        .update({
          amount: used,
          status: used > 0 ? 'used' : 'void',
        })
        .eq('id', grant.id);
    }
    await supabase.from('referrals').update({ status: 'void' }).eq('id', referral.id);
  }

  const { data: conversion } = await supabase
    .from('affiliate_conversions')
    .select('id, status, commission_amount, affiliate_id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (!conversion || conversion.status === 'void' || conversion.status === 'paid') return;
  await supabase.from('affiliate_conversions').update({ status: 'void' }).eq('id', conversion.id);
  if (String(conversion.status).startsWith('payout:')) {
    const payoutId = String(conversion.status).slice('payout:'.length);
    const { data: payout } = await supabase
      .from('affiliate_payouts')
      .select('id, amount, status')
      .eq('id', payoutId)
      .maybeSingle();
    if (payout && payout.status === 'pending') {
      const next = roundMoney((Number(payout.amount) || 0) - (Number(conversion.commission_amount) || 0));
      if (next <= 0 || !canOpenPayout(next)) {
        await supabase.from('affiliate_payouts').delete().eq('id', payoutId);
        await supabase
          .from('affiliate_conversions')
          .update({ status: 'payable' })
          .eq('status', `payout:${payoutId}`);
      } else {
        await supabase.from('affiliate_payouts').update({ amount: next }).eq('id', payoutId);
      }
    }
  }
}

export async function settleMatureRewards(opts?: { userId?: string }): Promise<void> {
  if (!isReferralAffiliateEnabled()) return;
  const supabase = db();
  const now = new Date();

  let referralQuery = supabase
    .from('referrals')
    .select('id, referrer_user_id, referred_user_id, status, booking_id')
    .eq('status', 'pending')
    .not('booking_id', 'is', null);
  if (opts?.userId) {
    referralQuery = referralQuery.or(
      `referrer_user_id.eq.${opts.userId},referred_user_id.eq.${opts.userId}`
    );
  }
  const { data: pending, error } = await referralQuery.limit(100);
  if (error) {
    if (quiet(error)) return;
    throw error;
  }

  for (const referral of pending || []) {
    if (!referral.booking_id) continue;
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status, payment_status, check_out')
      .eq('id', referral.booking_id)
      .maybeSingle();
    if (!booking) continue;
    const cancelled = isCancelledOrRefunded(String(booking.status || ''), String(booking.payment_status || ''));
    if (cancelled) {
      await onBookingCancelledOrRefunded(String(booking.id));
      continue;
    }
    const reward = rewardCreditsForCompletedStay({
      cancelledOrRefunded: false,
      checkoutPassed: checkoutDatePassed(String(booking.check_out || ''), now),
      alreadyRewarded: false,
      paid: String(booking.payment_status || '') === 'paid',
    });
    if (reward <= 0) continue;
    const { data: existingGrant } = await supabase
      .from('referral_credits')
      .select('id')
      .eq('source_referral_id', referral.id)
      .gt('amount', 0)
      .maybeSingle();
    if (existingGrant?.id) {
      await supabase
        .from('referrals')
        .update({ status: 'completed', completed_at: now.toISOString() })
        .eq('id', referral.id);
      continue;
    }
    await supabase.from('referral_credits').insert({
      user_id: referral.referrer_user_id,
      amount: reward,
      source_referral_id: referral.id,
      expires_at: creditExpiresAt(now),
      used_amount: 0,
      status: 'available',
    });
    await supabase
      .from('referrals')
      .update({ status: 'completed', completed_at: now.toISOString() })
      .eq('id', referral.id);
  }

  const { data: conversions, error: conversionError } = await supabase
    .from('affiliate_conversions')
    .select('id, affiliate_id, booking_id, rent_amount, commission_amount, status')
    .eq('status', 'pending')
    .limit(200);
  if (conversionError) {
    if (quiet(conversionError)) return;
    throw conversionError;
  }
  for (const conversion of conversions || []) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('status, payment_status, check_out, guest_email')
      .eq('id', conversion.booking_id)
      .maybeSingle();
    if (!booking) continue;
    const cancelled = isCancelledOrRefunded(String(booking.status || ''), String(booking.payment_status || ''));
    if (cancelled) {
      await onBookingCancelledOrRefunded(String(conversion.booking_id));
      continue;
    }
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('email')
      .eq('id', conversion.affiliate_id)
      .maybeSingle();
    const commission = affiliateCommissionForBooking({
      rent: Number(conversion.rent_amount) || 0,
      clickedAt: new Date(now.getTime() - 1000),
      bookedAt: now,
      selfBooking: normalizeEmail(affiliate?.email) === normalizeEmail(booking.guest_email),
      cancelledOrRefunded: false,
      checkoutPassed: checkoutDatePassed(String(booking.check_out || ''), now),
    });
    if (!checkoutDatePassed(String(booking.check_out || ''), now)) continue;
    if (String(booking.payment_status || '') !== 'paid') continue;
    if (commission <= 0) {
      await supabase.from('affiliate_conversions').update({ status: 'void', commission_amount: 0 }).eq('id', conversion.id);
      continue;
    }
    await supabase
      .from('affiliate_conversions')
      .update({
        status: 'payable',
        commission_amount: commission,
        stay_completed_at: now.toISOString(),
      })
      .eq('id', conversion.id);
  }

  await openReadyPayouts(supabase);
}

async function openReadyPayouts(supabase: SupabaseClient) {
  const { data: payable, error } = await supabase
    .from('affiliate_conversions')
    .select('id, affiliate_id, commission_amount, stay_completed_at, status')
    .eq('status', 'payable')
    .limit(500);
  if (error || !payable?.length) return;
  const groups = new Map<string, typeof payable>();
  for (const row of payable) {
    const key = `${row.affiliate_id}|${payoutPeriod(row.stay_completed_at || new Date().toISOString())}`;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  for (const [key, rows] of groups) {
    const [affiliateId, period] = key.split('|');
    const amount = roundMoney(rows.reduce((sum, row) => sum + (Number(row.commission_amount) || 0), 0));
    if (!canOpenPayout(amount)) continue;
    const { data: existing } = await supabase
      .from('affiliate_payouts')
      .select('id')
      .eq('affiliate_id', affiliateId)
      .eq('period', period)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing?.id) continue;
    const { data: payout, error: insertError } = await supabase
      .from('affiliate_payouts')
      .insert({
        affiliate_id: affiliateId,
        amount,
        period,
        status: 'pending',
        paid_at: null,
      })
      .select('id')
      .single();
    if (insertError || !payout?.id) continue;
    await supabase
      .from('affiliate_conversions')
      .update({ status: `payout:${payout.id}` })
      .in(
        'id',
        rows.map((row) => row.id)
      );
  }
}

export async function recordAffiliateClick(params: {
  code: string;
  ip: string;
  userAgent: string;
}): Promise<{ affiliateId: string; cookieValue: string; link: string } | null> {
  if (!isReferralAffiliateEnabled()) return null;
  const code = normalizeCode(params.code);
  const supabase = db();
  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .select('id, status, code')
    .eq('code', code)
    .maybeSingle();
  if (error || !affiliate || affiliate.status !== 'active') return null;
  const clickedAt = new Date();
  await supabase.from('affiliate_clicks').insert({
    affiliate_id: affiliate.id,
    clicked_at: clickedAt.toISOString(),
    ip_hash: hashIp(params.ip || 'unknown'),
    user_agent: params.userAgent.slice(0, 300),
  });
  return {
    affiliateId: affiliate.id,
    cookieValue: `${affiliate.id}.${clickedAt.getTime()}`,
    link: affiliateLinkForCode(affiliate.code),
  };
}

export async function lookupReferralCode(code: string): Promise<string | null> {
  if (!isReferralAffiliateEnabled()) return null;
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const supabase = db();
  const { data } = await supabase
    .from('referrals')
    .select('code')
    .eq('code', normalized)
    .is('referred_user_id', null)
    .eq('status', 'link')
    .maybeSingle();
  return data?.code || null;
}

export async function createAffiliate(params: { name: string; email: string }) {
  if (!isReferralAffiliateEnabled()) return { error: 'Referral and affiliate is off.' };
  const name = params.name.trim();
  const email = normalizeEmail(params.email);
  if (!name || !email.includes('@')) return { error: 'Name and a valid email are required.' };
  const supabase = db();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode();
    const link = affiliateLinkForCode(code);
    const { data, error } = await supabase
      .from('affiliates')
      .insert({ name, email, code, link, status: 'active' })
      .select('id, name, email, code, link, status, created_at')
      .single();
    if (!error && data) return { affiliate: data };
    if (error && /affiliates_email|email/i.test(error.message || '')) {
      return { error: 'An affiliate with that email already exists.' };
    }
    if (error && !/duplicate|unique/i.test(error.message || '')) {
      return { error: error.message };
    }
  }
  return { error: 'Could not create a unique affiliate code.' };
}

export async function adminAffiliateBoard() {
  if (!isReferralAffiliateEnabled()) return { enabled: false as const, rows: [] };
  await settleMatureRewards();
  const supabase = db();
  const { data: affiliates, error } = await supabase
    .from('affiliates')
    .select('id, name, email, code, link, status, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    if (quiet(error)) return { enabled: true as const, rows: [], payouts: [] };
    throw error;
  }
  const ids = (affiliates || []).map((row) => row.id);
  const [{ data: clicks }, { data: conversions }, { data: payouts }] = await Promise.all([
    ids.length
      ? supabase.from('affiliate_clicks').select('affiliate_id').in('affiliate_id', ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase
          .from('affiliate_conversions')
          .select('affiliate_id, commission_amount, status')
          .in('affiliate_id', ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase
          .from('affiliate_payouts')
          .select('id, affiliate_id, amount, period, status, paid_at')
          .in('affiliate_id', ids)
          .order('period', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const rows = (affiliates || []).map((affiliate) => {
    const clickCount = (clicks || []).filter((row) => row.affiliate_id === affiliate.id).length;
    const mine = (conversions || []).filter((row) => row.affiliate_id === affiliate.id);
    const bookings = mine.filter((row) => row.status !== 'void').length;
    const owed = roundMoney(
      mine
        .filter((row) => row.status === 'payable' || String(row.status).startsWith('payout:'))
        .reduce((sum, row) => sum + (Number(row.commission_amount) || 0), 0)
    );
    const latest = (payouts || []).find((row) => row.affiliate_id === affiliate.id);
    return {
      ...affiliate,
      clicks: clickCount,
      bookings,
      commissionOwed: owed,
      payoutStatus: latest ? latest.status : owed > 0 && !canOpenPayout(owed) ? 'below_minimum' : 'none',
    };
  });
  return { enabled: true as const, rows, payouts: payouts || [] };
}

export async function markAffiliatePayoutPaid(payoutId: string) {
  if (!isReferralAffiliateEnabled()) return { error: 'Referral and affiliate is off.' };
  const supabase = db();
  const { data: payout } = await supabase
    .from('affiliate_payouts')
    .select('id, status')
    .eq('id', payoutId)
    .maybeSingle();
  if (!payout) return { error: 'Payout not found.' };
  if (payout.status === 'paid') return { ok: true };
  const { error } = await supabase
    .from('affiliate_payouts')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', payoutId);
  if (error) return { error: error.message };
  await supabase
    .from('affiliate_conversions')
    .update({ status: 'paid' })
    .eq('status', `payout:${payoutId}`);
  return { ok: true };
}
