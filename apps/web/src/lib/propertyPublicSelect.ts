/**
 * Columns for public-facing property reads (omit `embedding` vector — see ADMIN properties route notes).
 * Prefer `cover_image` over `images[]` on list paths — galleries often store huge base64 blobs.
 */

const PROPERTY_PUBLIC_FIELD_LIST = [
  'id',
  'host_id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'reviews_count',
  'has_team_review',
  'cover_image',
  'type',
  'amenities',
  'guests',
  'status',
  'created_at',
  'updated_at',
  'description',
  'bedrooms',
  'bathrooms',
  'beds',
  'wellness_friendly',
  'wellness_consumption_indoor_allowed',
  'wellness_consumption_outdoor_allowed',
  'cleaning_fee',
  'refundable_deposit',
  'google_maps_url',
  'latitude',
  'longitude',
  'smoking_inside_allowed',
  'smoking_outside_allowed',
  'smoke_friendly',
  /** When set, stay must be at least this many nights (host optional rule). */
  'min_booking_nights',
  /** Host storefront line; safe when column exists (IF NOT EXISTS migration). */
  'vibesbnb_take',
  /** When true, guest may pay immediately without host pre-approval in messages. */
  'allow_direct_booking',
  /** Standard arrival / departure clock times (HH:mm) and optional early/late opts. */
  'check_in_time',
  'check_out_time',
  'early_check_in_allowed',
  'earliest_early_check_in_time',
  'early_check_in_fee',
  'late_check_out_allowed',
  'latest_late_check_out_time',
  'late_check_out_fee',
  'cancellation_policy',
  'parties_allowed',
  'safety_smoke_co_detectors',
  'safety_first_aid_kit',
  'safety_emergency_exits',
  'safety_building_security',
] as const;

/** Search, map, cards, APIs that list many properties — no images[] / rooms. */
export const PROPERTY_PUBLIC_LIST_COLUMNS = PROPERTY_PUBLIC_FIELD_LIST.join(',');

/**
 * Browse/search/map payloads — omit heavy columns (description, rooms JSON, images[]).
 */
const PROPERTY_BROWSE_FIELD_LIST = [
  'id',
  'host_id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'reviews_count',
  'has_team_review',
  'cover_image',
  'type',
  'amenities',
  'guests',
  'status',
  'created_at',
  'bedrooms',
  'bathrooms',
  'beds',
  'wellness_friendly',
  'wellness_consumption_indoor_allowed',
  'wellness_consumption_outdoor_allowed',
  'latitude',
  'longitude',
  'smoking_inside_allowed',
  'smoking_outside_allowed',
  'smoke_friendly',
  'min_booking_nights',
  'vibesbnb_take',
] as const;

export const PROPERTY_BROWSE_LIST_COLUMNS = PROPERTY_BROWSE_FIELD_LIST.join(',');

/** Featured homepage cards — browse fields plus description (trimmed in UI). */
export const PROPERTY_FEATURED_LIST_COLUMNS = `${PROPERTY_BROWSE_LIST_COLUMNS},description`;

/**
 * Single listing first paint — everything except fat `images[]` / `rooms`.
 * Gallery loads via `/api/properties/[id]/gallery` after paint.
 */
const PROPERTY_DETAIL_CORE_FIELD_LIST = [
  ...PROPERTY_PUBLIC_FIELD_LIST,
  'guest_agreement_url',
  'allow_extra_guests',
  'extra_guest_price',
] as const;

export const PROPERTY_DETAIL_CORE_COLUMNS = PROPERTY_DETAIL_CORE_FIELD_LIST.join(',');

/** @deprecated Prefer PROPERTY_DETAIL_CORE_COLUMNS + gallery API — includes images/rooms. */
const PROPERTY_DETAIL_FIELD_LIST = [
  ...PROPERTY_DETAIL_CORE_FIELD_LIST,
  'images',
  'rooms',
] as const;

/** Single listing + checkout — still no embeddings (legacy full row). */
export const PROPERTY_DETAIL_PUBLIC_COLUMNS = PROPERTY_DETAIL_FIELD_LIST.join(',');
