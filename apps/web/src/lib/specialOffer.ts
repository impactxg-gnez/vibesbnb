import { computeLodgingWithBakedFee } from '@/lib/platformPricing';
import { nightsBetweenYmd } from '@/lib/dateUtils';
import type { HostPayoutPreviewData } from '@/hooks/useHostPayoutPreview';

export const SPECIAL_OFFER_PREFIX = '::vibesbnb-offer::';
export const MAX_OFFER_DISCOUNT_PERCENT = 80;

export type SpecialOfferPayload = {
  v: 1;
  originalNightly: number;
  offerNightly: number;
  discountPercent: number;
  nights: number;
  checkIn?: string | null;
  checkOut?: string | null;
  guestTotal: number;
  lodgingGross: number;
  hostFee: number;
  hostAmount: number;
  hostFeePercent: number;
};

export type SpecialOfferContext = {
  listedNightly: number;
  cleaningFee: number;
  nights: number;
  checkIn: string | null;
  checkOut: string | null;
  bookingId: string | null;
  serviceFeePercent: number;
  hostFeePercent: number;
};

function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function stayNightsFromDates(
  checkIn?: string | null,
  checkOut?: string | null
): number {
  const nights = nightsBetweenYmd(String(checkIn || ''), String(checkOut || ''));
  return nights > 0 ? nights : 1;
}

export function discountPercentFromOffer(
  originalNightly: number,
  offerNightly: number
): number {
  if (!(originalNightly > 0)) return 0;
  const raw = ((originalNightly - offerNightly) / originalNightly) * 100;
  return Math.min(
    MAX_OFFER_DISCOUNT_PERCENT,
    Math.max(0, Math.round(raw * 10) / 10)
  );
}

export function offerNightlyFromDiscount(
  originalNightly: number,
  discountPercent: number
): number {
  const pct = Math.min(MAX_OFFER_DISCOUNT_PERCENT, Math.max(0, discountPercent));
  return roundMoney(Math.max(1, originalNightly * (1 - pct / 100)));
}

/** Lodging-only payout for a custom nightly rate (no extras/taxes). */
export function previewSpecialOfferPayout(params: {
  offerNightly: number;
  nights: number;
  cleaningFee: number;
  serviceFeePercent: number;
  hostFeePercent: number;
}): HostPayoutPreviewData {
  const nights = Math.max(1, Math.floor(params.nights) || 1);
  const offerNightly = Math.max(0, Number(params.offerNightly) || 0);
  const lodging = computeLodgingWithBakedFee({
    hostNightlyRate: offerNightly,
    nights,
    hostCleaningFee: Math.max(0, Number(params.cleaningFee) || 0),
    feePercent: params.serviceFeePercent,
  });
  const guestTotal = roundMoney(lodging.travelerLodgingTotal);
  const lodgingGross = roundMoney(lodging.hostSubtotal);
  const hostFee = roundMoney(guestTotal * (params.hostFeePercent / 100));
  const hostAmount = roundMoney(Math.max(0, lodgingGross - hostFee));
  return {
    guestTotal,
    lodgingGross,
    hostFee,
    hostAmount,
    hostFeePercent: params.hostFeePercent,
    nights,
  };
}

export function encodeSpecialOfferMessage(payload: SpecialOfferPayload): {
  body: string;
  lastMessage: string;
} {
  const lastMessage = `Special offer: $${payload.offerNightly.toFixed(0)}/night (${payload.discountPercent}% off)`;
  const body = `${SPECIAL_OFFER_PREFIX}${JSON.stringify(payload)}\n\n${lastMessage}`;
  return { body, lastMessage };
}

export function parseSpecialOffer(body: string): SpecialOfferPayload | null {
  if (typeof body !== 'string' || !body.startsWith(SPECIAL_OFFER_PREFIX)) return null;
  const jsonLine = body.slice(SPECIAL_OFFER_PREFIX.length).split('\n')[0];
  try {
    const parsed = JSON.parse(jsonLine) as SpecialOfferPayload;
    if (parsed?.v !== 1 || !Number.isFinite(parsed.offerNightly)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Newest special-offer payload in a conversation, if any. */
export async function fetchLatestSpecialOffer(
  client: { from: (table: string) => any },
  conversationId: string
): Promise<SpecialOfferPayload | null> {
  const { data } = await client
    .from('messages')
    .select('body')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(50);
  for (const row of data || []) {
    const parsed = parseSpecialOffer(String(row.body || ''));
    if (parsed) return parsed;
  }
  return null;
}
