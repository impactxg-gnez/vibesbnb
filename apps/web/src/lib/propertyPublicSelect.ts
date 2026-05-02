/**
 * Columns for public-facing property lists (search, map, featured, favorites).
 *
 * Never use `select('*')` here: `properties.embedding` is vector(768) and blows up
 * response size plus can trigger Postgres/PostgREST statement timeouts on full scans.
 *
 * Keep in sync with fields used by search cards, maps, featured components, and
 * `/host/[id]` / `/users/[id]` listing grids. Omit `rejection_reason` and embeddings.
 */
export const PROPERTY_PUBLIC_LIST_COLUMNS = [
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
].join(',');
