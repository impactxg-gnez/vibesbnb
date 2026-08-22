/**
 * Column sets for admin property queries.
 * Never select `embedding` (vector) or full row (`*`) on list endpoints — causes statement timeouts.
 */

/** Lightweight list rows for admin grids (no images/description/embedding). */
export const ADMIN_PROPERTY_LIST_COLUMNS = [
  'id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'type',
  'amenities',
  'guests',
  'status',
  'created_at',
  'updated_at',
  'host_id',
  'bedrooms',
  'bathrooms',
  'beds',
  'wellness_friendly',
  'rejection_reason',
  'cleaning_fee',
  'google_maps_url',
].join(',');

/** Single-property admin edit — includes media/text but still omits embedding. */
export const ADMIN_PROPERTY_DETAIL_COLUMNS = [
  ...ADMIN_PROPERTY_LIST_COLUMNS.split(','),
  'description',
  'images',
].join(',');

export const ADMIN_PROPERTY_LIST_DEFAULT_LIMIT = 200;
export const ADMIN_PROPERTY_LIST_MAX_LIMIT = 500;
