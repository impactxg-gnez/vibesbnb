import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SALES_TAX_PERCENT,
  TOURIST_DEVELOPMENT_TAX_PERCENT,
} from '@vibesbnb/shared';
import { computeBookingQuote } from '@/lib/bookingQuote';
import { computeHostPayoutAmounts } from '@/lib/hostPayouts';
import { getServiceFeePercent } from '@/lib/platformSettings';

export type ReportPeriod = 'day' | 'week' | 'month';

export type SalesReportDetailRow = {
  booking_id: string;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
  property_name: string | null;
  host_id: string | null;
  host_name: string | null;
  booking_status: string | null;
  payment_status: string | null;
  payout_status: string | null;
  guest_total: number;
  host_transfer: number;
  service_fee: number;
  sales_tax: number;
  tourist_tax: number;
  taxes_total: number;
  cleaning_fee: number;
  is_refund: boolean;
};

export type SalesReportBucket = {
  date: string;
  sales: number;
  refunds: number;
  host_transfer: number;
  service_fee: number;
  sales_tax: number;
  tourist_tax: number;
  taxes_total: number;
  bookings: number;
};

export type SalesReport = {
  period: ReportPeriod;
  period_start: string;
  period_end: string;
  service_fee_percent: number;
  sales_tax_percent: number;
  tourist_tax_percent: number;
  summary: {
    guest_sales: number;
    refunds: number;
    net_guest_sales: number;
    host_transfer: number;
    service_fee: number;
    sales_tax: number;
    tourist_tax: number;
    taxes_total: number;
    bookings_count: number;
    paid_bookings_count: number;
    refund_bookings_count: number;
  };
  breakdown: SalesReportBucket[];
  rows: SalesReportDetailRow[];
};

function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function datePart(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.split('T')[0];
}

export function startDateForPeriod(period: ReportPeriod, now: Date): Date {
  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(now.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function bucketKey(iso: string): string {
  return datePart(iso) || iso.slice(0, 10);
}

function isRefundBooking(status: string | null, paymentStatus: string | null): boolean {
  const s = String(status || '').toLowerCase();
  const p = String(paymentStatus || '').toLowerCase();
  return s === 'cancelled' || s === 'rejected' || p === 'refunded';
}

function isPaidSale(status: string | null, paymentStatus: string | null): boolean {
  if (isRefundBooking(status, paymentStatus)) return false;
  const p = String(paymentStatus || '').toLowerCase();
  const s = String(status || '').toLowerCase();
  return (
    p === 'paid' ||
    s === 'accepted' ||
    s === 'confirmed' ||
    s === 'completed'
  );
}

type BookingRow = {
  id: string;
  created_at: string;
  check_in?: string | null;
  check_out?: string | null;
  property_id?: string | null;
  property_name?: string | null;
  host_id?: string | null;
  total_price?: number | null;
  status?: string | null;
  payment_status?: string | null;
  guests?: number | null;
  kids?: number | null;
  pets?: number | null;
  wellness_line_items?: unknown;
};

type PayoutRow = {
  booking_id: string;
  host_amount?: number | null;
  platform_fee?: number | null;
  status?: string | null;
};

type PropertyRow = {
  id: string;
  price?: number | null;
  cleaning_fee?: number | null;
  guests?: number | null;
  allow_extra_guests?: boolean | null;
  extra_guest_price?: number | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
};

function wellnessLines(raw: unknown): Array<{ name: string; price: number }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((line) => {
      const o = line as { name?: string; price?: number };
      return {
        name: String(o?.name || 'Wellness'),
        price: Math.max(0, Number(o?.price) || 0),
      };
    })
    .filter((l) => l.price > 0);
}

function splitForBooking(params: {
  booking: BookingRow;
  payout?: PayoutRow | null;
  property?: PropertyRow | null;
  feePercent: number;
}): {
  guestTotal: number;
  hostTransfer: number;
  serviceFee: number;
  salesTax: number;
  touristTax: number;
  cleaningFee: number;
} {
  const guestTotal = roundMoney(Number(params.booking.total_price) || 0);
  const checkIn = datePart(params.booking.check_in);
  const checkOut = datePart(params.booking.check_out);

  let hostTransfer = 0;
  let serviceFee = 0;
  if (params.payout) {
    hostTransfer = roundMoney(Number(params.payout.host_amount) || 0);
    serviceFee = roundMoney(Number(params.payout.platform_fee) || 0);
  } else {
    const amounts = computeHostPayoutAmounts({
      checkIn,
      checkOut,
      guestTotal,
      hostNightlyRate: params.property?.price != null ? Number(params.property.price) : null,
      hostCleaningFee:
        params.property?.cleaning_fee != null ? Number(params.property.cleaning_fee) : 0,
      feePercent: params.feePercent,
    });
    hostTransfer = amounts.hostAmount;
    serviceFee = amounts.platformFee;
  }

  let salesTax = 0;
  let touristTax = 0;
  let cleaningFee =
    params.property?.cleaning_fee != null
      ? roundMoney(Number(params.property.cleaning_fee) || 0)
      : 0;

  if (params.property && checkIn && checkOut) {
    const quote = computeBookingQuote({
      checkInYmd: checkIn,
      checkOutYmd: checkOut,
      hostNightlyRate: Number(params.property.price) || 0,
      hostCleaningFee: cleaningFee,
      allowExtraGuests: params.property.allow_extra_guests === true,
      extraGuestPrice: Number(params.property.extra_guest_price) || 0,
      includedGuests: Number(params.property.guests) || 1,
      adults: Number(params.booking.guests) || 1,
      kids: Number(params.booking.kids) || 0,
      pets: Number(params.booking.pets) || 0,
      wellnessLineItems: wellnessLines(params.booking.wellness_line_items),
      feePercent: params.feePercent,
      applyCardFee: false,
    });
    if (quote) {
      salesTax = quote.salesTax;
      touristTax = quote.touristTax;
      cleaningFee = quote.cleaningFee;
      // Prefer quote lodging fee when no payout ledger row
      if (!params.payout) {
        serviceFee = quote.platformFee;
        hostTransfer = roundMoney(quote.totalRent + quote.cleaningFee);
      }
    }
  } else if (guestTotal > 0 && hostTransfer + serviceFee > 0) {
    // Remainder after lodging split ≈ taxes (+ extras/card). Attribute with statutory rates.
    const remainder = Math.max(0, guestTotal - hostTransfer - serviceFee);
    const taxShare = SALES_TAX_PERCENT + TOURIST_DEVELOPMENT_TAX_PERCENT;
    if (taxShare > 0 && remainder > 0) {
      salesTax = roundMoney(remainder * (SALES_TAX_PERCENT / taxShare));
      touristTax = roundMoney(remainder - salesTax);
    }
  }

  return {
    guestTotal,
    hostTransfer,
    serviceFee,
    salesTax,
    touristTax,
    cleaningFee,
  };
}

/** Build daily/weekly/monthly sales report with host / fee / tax splits. */
export async function buildSalesReport(
  service: SupabaseClient,
  period: ReportPeriod,
  now: Date = new Date()
): Promise<SalesReport> {
  const start = startDateForPeriod(period, now);
  const feePercent = await getServiceFeePercent(service);

  const { data: bookingsData, error } = await service
    .from('bookings')
    .select(
      'id, created_at, check_in, check_out, property_id, property_name, host_id, total_price, status, payment_status, guests, kids, pets, wellness_line_items'
    )
    .gte('created_at', start.toISOString())
    .lte('created_at', now.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  const bookings = (bookingsData || []) as BookingRow[];
  const bookingIds = bookings.map((b) => b.id);
  const propertyIds = [
    ...new Set(bookings.map((b) => b.property_id).filter(Boolean) as string[]),
  ];
  const hostIds = [
    ...new Set(bookings.map((b) => b.host_id).filter(Boolean) as string[]),
  ];

  const payoutByBooking = new Map<string, PayoutRow>();
  if (bookingIds.length > 0) {
    const { data: payouts } = await service
      .from('host_payouts')
      .select('booking_id, host_amount, platform_fee, status')
      .in('booking_id', bookingIds);
    for (const p of payouts || []) {
      payoutByBooking.set(String(p.booking_id), p as PayoutRow);
    }
  }

  const propertyById = new Map<string, PropertyRow>();
  if (propertyIds.length > 0) {
    const { data: properties } = await service
      .from('properties')
      .select('id, price, cleaning_fee, guests, allow_extra_guests, extra_guest_price')
      .in('id', propertyIds);
    for (const p of properties || []) {
      propertyById.set(String(p.id), p as PropertyRow);
    }
  }

  const hostNameById = new Map<string, string>();
  if (hostIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name')
      .in('id', hostIds);
    for (const p of (profiles || []) as ProfileRow[]) {
      if (p.full_name) hostNameById.set(String(p.id), String(p.full_name));
    }
  }

  const buckets = new Map<string, SalesReportBucket>();
  const rows: SalesReportDetailRow[] = [];

  let guestSales = 0;
  let refunds = 0;
  let hostTransferSum = 0;
  let serviceFeeSum = 0;
  let salesTaxSum = 0;
  let touristTaxSum = 0;
  let paidCount = 0;
  let refundCount = 0;

  for (const booking of bookings) {
    const refund = isRefundBooking(booking.status || null, booking.payment_status || null);
    const paid = isPaidSale(booking.status || null, booking.payment_status || null);
    const split = splitForBooking({
      booking,
      payout: payoutByBooking.get(booking.id) || null,
      property: booking.property_id
        ? propertyById.get(booking.property_id) || null
        : null,
      feePercent,
    });

    const day = bucketKey(booking.created_at);
    if (!buckets.has(day)) {
      buckets.set(day, {
        date: day,
        sales: 0,
        refunds: 0,
        host_transfer: 0,
        service_fee: 0,
        sales_tax: 0,
        tourist_tax: 0,
        taxes_total: 0,
        bookings: 0,
      });
    }
    const bucket = buckets.get(day)!;
    bucket.bookings += 1;

    const taxesTotal = roundMoney(split.salesTax + split.touristTax);

    if (refund) {
      refundCount += 1;
      refunds = roundMoney(refunds + split.guestTotal);
      bucket.refunds = roundMoney(bucket.refunds + split.guestTotal);
    } else if (paid) {
      paidCount += 1;
      guestSales = roundMoney(guestSales + split.guestTotal);
      hostTransferSum = roundMoney(hostTransferSum + split.hostTransfer);
      serviceFeeSum = roundMoney(serviceFeeSum + split.serviceFee);
      salesTaxSum = roundMoney(salesTaxSum + split.salesTax);
      touristTaxSum = roundMoney(touristTaxSum + split.touristTax);
      bucket.sales = roundMoney(bucket.sales + split.guestTotal);
      bucket.host_transfer = roundMoney(bucket.host_transfer + split.hostTransfer);
      bucket.service_fee = roundMoney(bucket.service_fee + split.serviceFee);
      bucket.sales_tax = roundMoney(bucket.sales_tax + split.salesTax);
      bucket.tourist_tax = roundMoney(bucket.tourist_tax + split.touristTax);
      bucket.taxes_total = roundMoney(bucket.taxes_total + taxesTotal);
    } else {
      // Pending / unpaid — include in bookings count only (not sales totals)
    }

    rows.push({
      booking_id: booking.id,
      created_at: booking.created_at,
      check_in: datePart(booking.check_in),
      check_out: datePart(booking.check_out),
      property_name: booking.property_name || null,
      host_id: booking.host_id || null,
      host_name: booking.host_id ? hostNameById.get(booking.host_id) || null : null,
      booking_status: booking.status || null,
      payment_status: booking.payment_status || null,
      payout_status: payoutByBooking.get(booking.id)?.status || null,
      guest_total: split.guestTotal,
      host_transfer: refund ? 0 : split.hostTransfer,
      service_fee: refund ? 0 : split.serviceFee,
      sales_tax: refund ? 0 : split.salesTax,
      tourist_tax: refund ? 0 : split.touristTax,
      taxes_total: refund ? 0 : taxesTotal,
      cleaning_fee: split.cleaningFee,
      is_refund: refund,
    });
  }

  const breakdown = [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
  const taxesTotal = roundMoney(salesTaxSum + touristTaxSum);

  return {
    period,
    period_start: start.toISOString(),
    period_end: now.toISOString(),
    service_fee_percent: feePercent,
    sales_tax_percent: SALES_TAX_PERCENT,
    tourist_tax_percent: TOURIST_DEVELOPMENT_TAX_PERCENT,
    summary: {
      guest_sales: guestSales,
      refunds,
      net_guest_sales: roundMoney(guestSales - refunds),
      host_transfer: hostTransferSum,
      service_fee: serviceFeeSum,
      sales_tax: salesTaxSum,
      tourist_tax: touristTaxSum,
      taxes_total: taxesTotal,
      bookings_count: bookings.length,
      paid_bookings_count: paidCount,
      refund_bookings_count: refundCount,
    },
    breakdown,
    rows,
  };
}
