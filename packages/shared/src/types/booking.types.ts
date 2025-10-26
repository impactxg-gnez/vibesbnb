export enum BookingStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELED = 'canceled',
  DECLINED = 'declined',
}

export enum CancellationPolicy {
  FLEXIBLE = 'flexible', // Full refund up to 24h before check-in
  MODERATE = 'moderate', // Full refund up to 5 days before check-in
  STRICT = 'strict', // 50% refund up to 7 days before check-in
  SUPER_STRICT = 'super_strict', // No refund
}

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  hostId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  status: BookingStatus;
  subtotal: number; // Sum of nightly rates
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
  currency: string;
  paymentIntentId?: string;
  payoutStatus: PayoutStatus;
  cancellationPolicy: CancellationPolicy;
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceBreakdown {
  nights: number;
  basePrice: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
  currency: string;
  nightlyRates: Array<{
    date: Date;
    price: number;
  }>;
}


