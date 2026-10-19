import { NextRequest, NextResponse } from 'next/server';
import { authenticateHostRequest } from '@/lib/auth/authenticateHostRequest';
import { isUndefinedColumnError } from '@/lib/propertyDetailFetch';
import {
  PROPERTY_CREATE_KEYS,
  pickWritableProperty,
} from '@/lib/propertyWritableColumns';
import {
  assertCanPublishListing,
  publishBlockedMessage,
  withPublishClockDefaults,
} from '@/lib/listingPublishGate';
import { REQUEST_TO_BOOK_ONLY } from '@/lib/p0MasterBuild';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LIST_COLUMNS = [
  'id',
  'name',
  'title',
  'description',
  'location',
  'bedrooms',
  'bathrooms',
  'beds',
  'guests',
  'price',
  'status',
  'wellness_friendly',
  'check_in_time',
  'check_out_time',
  'google_maps_url',
  'source_url',
  'latitude',
  'longitude',
  'type',
  'amenities',
  'cover_image',
  'created_at',
  'custom_slug',
].join(',');

const LIST_COLUMNS_NO_SLUG = LIST_COLUMNS.replace(',custom_slug', '');

const STATUSES = new Set(['active', 'draft', 'inactive', 'pending_approval']);

async function insertDroppingUnknownColumns(
  db: ReturnType<typeof createServiceClient>,
  row: Record<string, unknown>
): Promise<string> {
  const payload: Record<string, unknown> = { ...row };
  for (let attempt = 0; attempt < 16; attempt++) {
    const { data, error } = await db.from('properties').insert(payload).select('id').maybeSingle();
    if (!error && data?.id) return String(data.id);
    if (!error) {
      const fallbackId = typeof payload.id === 'string' ? payload.id : '';
      if (fallbackId) return fallbackId;
      throw new Error('Listing was not saved');
    }
    if (!isUndefinedColumnError(error)) throw error;
    const match = String(error.message || '').match(/'?([a-z_]+)'? column/i)
      || String(error.message || '').match(/column "?([a-z_]+)"?/i);
    const column = match?.[1];
    if (!column || !(column in payload)) throw error;
    delete payload[column];
  }
  throw new Error('Listing could not be saved');
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateHostRequest(request);
    if ('response' in auth) return auth.response;

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      );
    }

    const db = createServiceClient();
    let query = db
      .from('properties')
      .select(LIST_COLUMNS)
      .eq('host_id', auth.hostId)
      .order('created_at', { ascending: false });

    let { data, error } = await query;
    if (error && /custom_slug/i.test(error.message || '')) {
      const retry = await db
        .from('properties')
        .select(LIST_COLUMNS_NO_SLUG)
        .eq('host_id', auth.hostId)
        .order('created_at', { ascending: false });
      data = retry.data as typeof data;
      error = retry.error;
    }
    if (error) throw error;

    return NextResponse.json(
      { properties: data || [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load properties';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateHostRequest(request);
    if ('response' in auth) return auth.response;

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const property =
      body?.property && typeof body.property === 'object' && !Array.isArray(body.property)
        ? (body.property as Record<string, unknown>)
        : (body as Record<string, unknown>);

    const insertPayload = pickWritableProperty(property, PROPERTY_CREATE_KEYS);
    const name =
      (typeof insertPayload.name === 'string' && insertPayload.name.trim()) ||
      (typeof insertPayload.title === 'string' && insertPayload.title.trim()) ||
      'Untitled listing';
    insertPayload.name = name;
    insertPayload.title = typeof insertPayload.title === 'string' && insertPayload.title.trim()
      ? insertPayload.title
      : name;

    if (insertPayload.status != null && !STATUSES.has(String(insertPayload.status))) {
      return NextResponse.json({ error: 'Invalid property status' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const propertyId =
      (typeof body?.id === 'string' && body.id.trim()) ||
      (typeof property.id === 'string' && property.id.trim()) ||
      `${auth.hostId}_${Date.now()}`;

    if (REQUEST_TO_BOOK_ONLY) insertPayload.allow_direct_booking = false;

    const db = createServiceClient();
    const nextStatus = String(insertPayload.status || 'draft');
    if (nextStatus === 'active') {
      const row = withPublishClockDefaults({ ...insertPayload, host_id: auth.hostId });
      insertPayload.check_in_time = row.check_in_time;
      insertPayload.check_out_time = row.check_out_time;
      const blockers = await assertCanPublishListing({
        db,
        row,
        hostId: auth.hostId,
      });
      if (blockers.length) {
        return NextResponse.json(
          { error: publishBlockedMessage(blockers), blockers },
          { status: 400 }
        );
      }
    }

    const savedId = await insertDroppingUnknownColumns(db, {
      ...insertPayload,
      id: propertyId,
      host_id: auth.hostId,
      status: insertPayload.status || 'draft',
      updated_at: now,
      created_at: now,
    });

    return NextResponse.json(
      { success: true, propertyId: savedId },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    console.error('[host/properties POST]', error);
    const message = error instanceof Error ? error.message : 'Failed to save listing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
