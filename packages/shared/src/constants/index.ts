export const PLATFORM_FEE_PERCENT = 10;
export const TAX_RATE_PERCENT = 8; // Varies by jurisdiction
export const MIN_BOOKING_DAYS = 1;
export const MAX_BOOKING_DAYS = 90;
export const MAX_GUESTS_PER_LISTING = 16;
export const MAX_LISTING_PHOTOS = 50;

export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$' },
  EUR: { code: 'EUR', symbol: '€' },
  GBP: { code: 'GBP', symbol: '£' },
  CAD: { code: 'CAD', symbol: 'CA$' },
};

export const AMENITIES = [
  'wifi',
  'kitchen',
  'washer',
  'dryer',
  'air_conditioning',
  'heating',
  'tv',
  'workspace',
  'pool',
  'hot_tub',
  'gym',
  'parking',
  'ev_charger',
  'smoking_allowed',
  'pets_allowed',
  'fireplace',
  'piano',
  'bbq_grill',
  'outdoor_seating',
  'beach_access',
  'lake_access',
  'ski_access',
] as const;

export const HOUSE_RULES = [
  'no_smoking',
  'no_pets',
  'no_parties',
  'no_events',
  'quiet_hours',
  'suitable_for_children',
  'suitable_for_infants',
] as const;

export const CANCELLATION_POLICY_DETAILS = {
  flexible: {
    name: 'Flexible',
    description: 'Full refund up to 24 hours before check-in',
    refundRules: [
      { daysBeforeCheckIn: 1, refundPercent: 100 },
      { daysBeforeCheckIn: 0, refundPercent: 0 },
    ],
  },
  moderate: {
    name: 'Moderate',
    description: 'Full refund up to 5 days before check-in',
    refundRules: [
      { daysBeforeCheckIn: 5, refundPercent: 100 },
      { daysBeforeCheckIn: 0, refundPercent: 50 },
    ],
  },
  strict: {
    name: 'Strict',
    description: '50% refund up to 7 days before check-in',
    refundRules: [
      { daysBeforeCheckIn: 7, refundPercent: 50 },
      { daysBeforeCheckIn: 0, refundPercent: 0 },
    ],
  },
  super_strict: {
    name: 'Super Strict',
    description: 'No refund after booking',
    refundRules: [{ daysBeforeCheckIn: 0, refundPercent: 0 }],
  },
};


