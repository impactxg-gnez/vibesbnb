/** Columns hosts/admins may write through the property editor and the admin create endpoint. */
export const PROPERTY_WRITABLE_COLUMNS = [
  'name',
  'title',
  'description',
  'location',
  'bedrooms',
  'beds',
  'bathrooms',
  'guests',
  'price',
  'type',
  'wellness_friendly',
  'wellness_consumption_indoor_allowed',
  'wellness_consumption_outdoor_allowed',
  'smoking_inside_allowed',
  'smoking_outside_allowed',
  'smoke_friendly',
  'allow_extra_guests',
  'extra_guest_price',
  'cleaning_fee',
  'refundable_deposit',
  'min_booking_nights',
  'allow_direct_booking',
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
  'amenities',
  'accessibility_description',
  'images',
  'image_alts',
  'rooms',
  'latitude',
  'longitude',
  'google_maps_url',
  'vibesbnb_take',
  'guest_agreement_url',
  'status',
  'updated_at',
] as const;

/** Extra columns only set when a listing is first created. */
const PROPERTY_CREATE_ONLY_COLUMNS = ['guest_access_type'] as const;

export const PROPERTY_UPDATE_KEYS: ReadonlySet<string> = new Set(PROPERTY_WRITABLE_COLUMNS);

export const PROPERTY_CREATE_KEYS: ReadonlySet<string> = new Set([
  ...PROPERTY_WRITABLE_COLUMNS,
  ...PROPERTY_CREATE_ONLY_COLUMNS,
]);

/** Keep only writable columns; callers must set `id` / `host_id` themselves. */
export function pickWritableProperty(
  raw: Record<string, unknown>,
  allowed: ReadonlySet<string>
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (allowed.has(key)) picked[key] = value;
  }
  delete picked.id;
  delete picked.host_id;
  return picked;
}
