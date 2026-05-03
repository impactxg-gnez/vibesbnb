/**
 * Columns for public-facing property reads (omit `embedding` vector — see ADMIN properties route notes).
 */

const PROPERTY_PUBLIC_FIELD_LIST = [
  'id',
  'host_id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'images',
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
  'cleaning_fee',
  'google_maps_url',
  'latitude',
  'longitude',
  'rooms',
  'smoking_inside_allowed',
  'smoking_outside_allowed',
  'smoke_friendly',
  /** Host storefront line; safe when column exists (IF NOT EXISTS migration). */
  'vibesbnb_take',
] as const;

/** Search, map, cards, APIs that list many properties */
export const PROPERTY_PUBLIC_LIST_COLUMNS = PROPERTY_PUBLIC_FIELD_LIST.join(',');

/**
 * Browse/search/map payloads — omit heavy columns (description, rooms JSON, unused URLs)
 * to keep TTFB + JSON parse time low for listing grids.
 */
const PROPERTY_BROWSE_FIELD_LIST = [
  'id',
  'host_id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'images',
  'type',
  'amenities',
  'guests',
  'status',
  'created_at',
  'bedrooms',
  'bathrooms',
  'beds',
  'wellness_friendly',
  'latitude',
  'longitude',
  'smoking_inside_allowed',
  'smoking_outside_allowed',
  'smoke_friendly',
  'vibesbnb_take',
] as const;

export const PROPERTY_BROWSE_LIST_COLUMNS = PROPERTY_BROWSE_FIELD_LIST.join(',');

/** Featured homepage cards — browse fields plus description (trimmed in UI). */
export const PROPERTY_FEATURED_LIST_COLUMNS = `${PROPERTY_BROWSE_LIST_COLUMNS},description`;

const PROPERTY_DETAIL_FIELD_LIST = [
  ...PROPERTY_PUBLIC_FIELD_LIST,
  'guest_agreement_url',
  'allow_extra_guests',
  'extra_guest_price',
] as const;

/** Single listing + checkout (booking new) — still no embeddings */
export const PROPERTY_DETAIL_PUBLIC_COLUMNS = PROPERTY_DETAIL_FIELD_LIST.join(',');
