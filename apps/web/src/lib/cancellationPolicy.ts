/**
 * Airbnb-style cancellation policies (short stay ≤27 nights, long-term 28+).
 * Refunds are calculated for ledger/UI; PayPal money movement stays manual.
 */

export type CancellationPolicyId = 'flexible' | 'moderate' | 'firm' | 'strict';

export const CANCELLATION_POLICY_IDS: CancellationPolicyId[] = [
  'flexible',
  'moderate',
  'firm',
  'strict',
];

export type CancellationPolicyOption = {
  id: CancellationPolicyId;
  name: string;
  shortDescription: string;
  detailLines: string[];
};

export const CANCELLATION_POLICY_OPTIONS: CancellationPolicyOption[] = [
  {
    id: 'flexible',
    name: 'Flexible',
    shortDescription: 'Full refund until 24 hours before check-in.',
    detailLines: [
      'Full refund if you cancel at least 24 hours before check-in.',
      'If you cancel within 24 hours of check-in, the first night is non-refundable; remaining nights are refunded.',
      'For stays of 28+ nights, Flexible listings follow the long-term Firm rules.',
    ],
  },
  {
    id: 'moderate',
    name: 'Moderate',
    shortDescription: 'Full refund until 5 days before check-in.',
    detailLines: [
      'Full refund if you cancel at least 5 days before check-in.',
      'If you cancel within 5 days, the first night plus 50% of remaining nights are charged.',
      'For stays of 28+ nights, Moderate listings follow the long-term Firm rules.',
    ],
  },
  {
    id: 'firm',
    name: 'Firm',
    shortDescription: 'Full refund until 30 days before check-in; partial after that.',
    detailLines: [
      'Full refund if you cancel at least 30 days before check-in.',
      'Cancel between 7 and 30 days before: 50% refund.',
      'Within 7 days of check-in: no refund for short stays.',
      'For stays of 28+ nights: full refund until 30 days before; after that the first 30 nights are charged and remaining nights are refunded.',
    ],
  },
  {
    id: 'strict',
    name: 'Strict',
    shortDescription: 'Best for long stays — full refund until 30 days before check-in.',
    detailLines: [
      'Intended for long-term stays (28+ nights).',
      'Full refund if you cancel at least 30 days before check-in.',
      'Within 30 days of check-in: no refund.',
      'For short stays (≤27 nights), Strict behaves like Firm.',
    ],
  },
];

export function normalizeCancellationPolicy(raw: unknown): CancellationPolicyId {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === 'moderate' || s === 'firm' || s === 'strict' || s === 'flexible') return s;
  return 'flexible';
}

export function getCancellationPolicyOption(id: CancellationPolicyId): CancellationPolicyOption {
  return (
    CANCELLATION_POLICY_OPTIONS.find((o) => o.id === id) ?? CANCELLATION_POLICY_OPTIONS[0]
  );
}

export type SafetyFlags = {
  smokeCoDetectors: boolean;
  firstAidKit: boolean;
  emergencyExits: boolean;
  buildingSecurity: boolean;
};

export const DEFAULT_SAFETY_FLAGS: SafetyFlags = {
  smokeCoDetectors: true,
  firstAidKit: true,
  emergencyExits: true,
  buildingSecurity: true,
};

export type CancellationSafetyDb = {
  cancellation_policy: CancellationPolicyId;
  parties_allowed: boolean;
  safety_smoke_co_detectors: boolean;
  safety_first_aid_kit: boolean;
  safety_emergency_exits: boolean;
  safety_building_security: boolean;
};

export function cancellationSafetyFromDbRow(row: Record<string, unknown> | null | undefined): {
  cancellationPolicy: CancellationPolicyId;
  partiesAllowed: boolean;
  safety: SafetyFlags;
} {
  return {
    cancellationPolicy: normalizeCancellationPolicy(row?.cancellation_policy),
    partiesAllowed: row?.parties_allowed === true,
    safety: {
      smokeCoDetectors: row?.safety_smoke_co_detectors !== false,
      firstAidKit: row?.safety_first_aid_kit !== false,
      emergencyExits: row?.safety_emergency_exits !== false,
      buildingSecurity: row?.safety_building_security !== false,
    },
  };
}

export function cancellationSafetyToDbColumns(opts: {
  cancellationPolicy: CancellationPolicyId;
  partiesAllowed: boolean;
  safety: SafetyFlags;
}): CancellationSafetyDb {
  return {
    cancellation_policy: normalizeCancellationPolicy(opts.cancellationPolicy),
    parties_allowed: opts.partiesAllowed === true,
    safety_smoke_co_detectors: opts.safety.smokeCoDetectors !== false,
    safety_first_aid_kit: opts.safety.firstAidKit !== false,
    safety_emergency_exits: opts.safety.emergencyExits !== false,
    safety_building_security: opts.safety.buildingSecurity !== false,
  };
}

function parseYmdUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 15, 0, 0)); // ~check-in afternoon UTC
}

function msBetween(a: Date, b: Date): number {
  return b.getTime() - a.getTime();
}

function daysUntilCheckIn(checkInYmd: string, at: Date): number {
  const checkIn = parseYmdUtc(checkInYmd);
  return Math.floor(msBetween(at, checkIn) / (24 * 60 * 60 * 1000));
}

function hoursBetween(a: Date, b: Date): number {
  return msBetween(a, b) / (60 * 60 * 1000);
}

export type RefundResult = {
  refundAmount: number;
  refundPercent: number;
  refundSummary: string;
  paymentStatus: 'refunded' | 'paid' | string;
};

export type ResolveRefundInput = {
  policy: CancellationPolicyId;
  nights: number;
  checkInYmd: string;
  bookedAt: Date | string;
  cancelledAt?: Date | string;
  totalPaid: number;
  cancelledBy: 'guest' | 'host';
  /** Prior payment_status; used when nothing was paid */
  priorPaymentStatus?: string | null;
};

function roundMoney(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100;
}

function resultFromPercent(
  totalPaid: number,
  percent: number,
  summary: string,
  priorPaymentStatus?: string | null
): RefundResult {
  const refundAmount = roundMoney((totalPaid * percent) / 100);
  const wasPaid = priorPaymentStatus === 'paid' || totalPaid > 0;
  const full = percent >= 99.5 || refundAmount >= totalPaid - 0.01;
  return {
    refundAmount,
    refundPercent: Math.round(percent * 10) / 10,
    refundSummary: summary,
    paymentStatus: wasPaid && full ? 'refunded' : wasPaid ? 'paid' : priorPaymentStatus || 'pending',
  };
}

/**
 * Calculate guest/host cancel refund. Host cancel → full refund of paid stay.
 * Guest: 24h grace (if booked ≥7 days before check-in), then Airbnb-style tiers.
 */
export function resolveRefund(input: ResolveRefundInput): RefundResult {
  const totalPaid = Number(input.totalPaid) || 0;
  const nights = Math.max(1, Math.floor(Number(input.nights) || 1));
  const bookedAt = new Date(input.bookedAt);
  const cancelledAt = new Date(input.cancelledAt ?? Date.now());
  const policy = normalizeCancellationPolicy(input.policy);
  const prior = input.priorPaymentStatus;

  if (input.cancelledBy === 'host') {
    if (totalPaid <= 0) {
      return {
        refundAmount: 0,
        refundPercent: 100,
        refundSummary: 'Host cancelled — no payment to refund',
        paymentStatus: prior || 'pending',
      };
    }
    return resultFromPercent(totalPaid, 100, 'Host cancelled — full refund', prior);
  }

  if (totalPaid <= 0) {
    return {
      refundAmount: 0,
      refundPercent: 0,
      refundSummary: 'No payment to refund',
      paymentStatus: prior || 'pending',
    };
  }

  const daysAtBook = daysUntilCheckIn(input.checkInYmd, bookedAt);
  const hoursSinceBook = hoursBetween(bookedAt, cancelledAt);
  if (hoursSinceBook <= 24 && daysAtBook >= 7) {
    return resultFromPercent(
      totalPaid,
      100,
      '24-hour grace period — full refund',
      prior
    );
  }

  const daysLeft = daysUntilCheckIn(input.checkInYmd, cancelledAt);
  const nightly = totalPaid / nights;
  const isLongTerm = nights >= 28;

  // Long-term stays (28+)
  if (isLongTerm) {
    const ltsStrict = policy === 'strict';
    if (daysLeft >= 30) {
      return resultFromPercent(
        totalPaid,
        100,
        ltsStrict
          ? 'Long-term Strict — full refund (30+ days before check-in)'
          : 'Long-term Firm — full refund (30+ days before check-in)',
        prior
      );
    }
    if (ltsStrict) {
      return resultFromPercent(
        totalPaid,
        0,
        'Long-term Strict — no refund within 30 days of check-in',
        prior
      );
    }
    // Firm LTS: charge first 30 nights, refund the rest
    const chargedNights = Math.min(30, nights);
    const refund = roundMoney(totalPaid - chargedNights * nightly);
    const percent = totalPaid > 0 ? (refund / totalPaid) * 100 : 0;
    return {
      refundAmount: refund,
      refundPercent: Math.round(percent * 10) / 10,
      refundSummary: 'Long-term Firm — first 30 nights charged; remaining nights refunded',
      paymentStatus: refund >= totalPaid - 0.01 ? 'refunded' : 'paid',
    };
  }

  // Short stays — Strict behaves like Firm
  const shortPolicy: CancellationPolicyId =
    policy === 'strict' ? 'firm' : policy === 'flexible' || policy === 'moderate' ? policy : 'firm';

  if (shortPolicy === 'flexible') {
    if (daysLeft >= 1 || (daysLeft === 0 && hoursBetween(cancelledAt, parseYmdUtc(input.checkInYmd)) >= 24)) {
      // full until 24h before check-in
      const hoursToCheckIn = hoursBetween(cancelledAt, parseYmdUtc(input.checkInYmd));
      if (hoursToCheckIn >= 24) {
        return resultFromPercent(totalPaid, 100, 'Flexible — full refund (24+ hours before check-in)', prior);
      }
    }
    const refund = roundMoney(totalPaid - nightly);
    const percent = totalPaid > 0 ? (refund / totalPaid) * 100 : 0;
    return {
      refundAmount: Math.max(0, refund),
      refundPercent: Math.round(percent * 10) / 10,
      refundSummary: 'Flexible — first night charged; remaining nights refunded',
      paymentStatus: refund >= totalPaid - 0.01 ? 'refunded' : 'paid',
    };
  }

  if (shortPolicy === 'moderate') {
    if (daysLeft >= 5) {
      return resultFromPercent(totalPaid, 100, 'Moderate — full refund (5+ days before check-in)', prior);
    }
    // First night + 50% of remaining
    const remaining = Math.max(0, nights - 1);
    const charged = nightly + remaining * nightly * 0.5;
    const refund = roundMoney(totalPaid - charged);
    const percent = totalPaid > 0 ? (refund / totalPaid) * 100 : 0;
    return {
      refundAmount: Math.max(0, refund),
      refundPercent: Math.round(percent * 10) / 10,
      refundSummary: 'Moderate — first night + 50% of remaining nights charged',
      paymentStatus: refund >= totalPaid - 0.01 ? 'refunded' : 'paid',
    };
  }

  // Firm (short)
  if (daysLeft >= 30) {
    return resultFromPercent(totalPaid, 100, 'Firm — full refund (30+ days before check-in)', prior);
  }
  if (daysLeft >= 7) {
    return resultFromPercent(totalPaid, 50, 'Firm — 50% refund (7–29 days before check-in)', prior);
  }
  return resultFromPercent(totalPaid, 0, 'Firm — no refund within 7 days of check-in', prior);
}

/** Guest-facing one-liner for PDP / checkout. */
export function cancellationPolicyGuestBlurb(policy: CancellationPolicyId, nightsHint?: number): string {
  const opt = getCancellationPolicyOption(policy);
  if (nightsHint != null && nightsHint >= 28) {
    if (policy === 'strict') {
      return 'Long-term Strict: full refund until 30 days before check-in; none after.';
    }
    return 'Long-term Firm: full refund until 30 days before check-in; first 30 nights charged after that.';
  }
  return opt.shortDescription;
}
