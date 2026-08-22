/**
 * Column sets for admin property queries.
 * Never select `embedding` (vector), `images`, `description`, `rooms`, or `*` on list endpoints.
 */

/** Minimal list rows for admin grids — only fields used in the table / filters. */
export const ADMIN_PROPERTY_LIST_COLUMNS = [
  'id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'status',
  'created_at',
  'host_id',
  'wellness_friendly',
].join(',');

/** Single-property admin edit — includes media/text but still omits embedding. */
export const ADMIN_PROPERTY_DETAIL_COLUMNS = [
  ...ADMIN_PROPERTY_LIST_COLUMNS.split(','),
  'type',
  'amenities',
  'guests',
  'updated_at',
  'bedrooms',
  'bathrooms',
  'beds',
  'rejection_reason',
  'cleaning_fee',
  'google_maps_url',
  'description',
  'images',
].join(',');

export const ADMIN_PROPERTY_LIST_DEFAULT_LIMIT = 50;
export const ADMIN_PROPERTY_LIST_MAX_LIMIT = 100;
