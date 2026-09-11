import { NextRequest, NextResponse } from 'next/server';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

/** Allowlisted columns hosts/admins may update via the property editor. */
const ALLOWED_UPDATE_KEYS = new Set([
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
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveHostPropertyAccess(params.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const raw = (body?.updates && typeof body.updates === 'object' ? body.updates : body) as Record<
      string,
      unknown
    >;

    const updatePayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (ALLOWED_UPDATE_KEYS.has(key)) {
        updatePayload[key] = value;
      }
    }

    // Never let callers reassign ownership through this endpoint
    delete updatePayload.host_id;
    delete updatePayload.id;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updatePayload.updated_at = new Date().toISOString();

    if (updatePayload.status != null) {
      const status = String(updatePayload.status);
      if (!['active', 'draft', 'inactive', 'pending_approval'].includes(status)) {
        return NextResponse.json({ error: 'Invalid property status' }, { status: 400 });
      }
    }

    const { error } = await access.db
      .from('properties')
      .update(updatePayload)
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    void invalidatePropertyListingCaches(params.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[host/properties PATCH]', error);
    const message = error instanceof Error ? error.message : 'Failed to update property';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
