import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceClient,
  createSupabaseForAdminApi,
  hasServiceRoleKey,
} from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { fetchAdminPropertyList } from '@/lib/adminPropertyList';
import {
  ADMIN_PROPERTY_DETAIL_COLUMNS,
  ADMIN_PROPERTY_LIST_DEFAULT_LIMIT,
  ADMIN_PROPERTY_LIST_MAX_LIMIT,
} from '@/lib/adminPropertySelect';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

function accessTokenFromRequest(request: NextRequest): string {
  return request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const serviceSupabase = createServiceClient();
    const propertyId = request.nextUrl.searchParams.get('propertyId');

    if (propertyId) {
      const { data, error } = await serviceSupabase
        .from('properties')
        .select(ADMIN_PROPERTY_DETAIL_COLUMNS)
        .eq('id', propertyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }
      return NextResponse.json({ property: data });
    }

    const status = request.nextUrl.searchParams.get('status') || 'all';
    const limitParam = Number(request.nextUrl.searchParams.get('limit'));
    const offsetParam = Number(request.nextUrl.searchParams.get('offset'));
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(1, limitParam), ADMIN_PROPERTY_LIST_MAX_LIMIT)
      : ADMIN_PROPERTY_LIST_DEFAULT_LIMIT;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    if (!hasServiceRoleKey()) {
      console.error(
        '[admin/properties] SUPABASE_SERVICE_ROLE_KEY is missing — admin list queries may time out.'
      );
      return NextResponse.json(
        {
          error:
            'Server missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel environment variables and redeploy.',
        },
        { status: 503 }
      );
    }

    const rows = await fetchAdminPropertyList(serviceSupabase, { status, limit, offset });

    return NextResponse.json({
      properties: rows,
      limit,
      offset,
      hasMore: rows.length === limit,
    });
  } catch (error: unknown) {
    console.error('Failed to load admin properties:', error);
    const message = error instanceof Error ? error.message : 'Failed to load properties';
    const hint =
      message.includes('statement timeout') || message.includes('57014')
        ? ' Run SUPABASE_ADMIN_LIST_PROPERTIES_RPC.sql in the Supabase SQL editor, then redeploy.'
        : '';
    return NextResponse.json({ error: `${message}${hint}` }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const {
      propertyId,
      status,
      rejectionReason,
      name,
      title,
      location,
      price,
      description,
      bedrooms,
      bathrooms,
      guests,
      beds,
    } = body;

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    const serviceSupabase = createSupabaseForAdminApi(accessTokenFromRequest(request));
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined && status !== null && status !== '') {
      if (!['active', 'draft', 'inactive', 'pending_approval'].includes(status)) {
        return NextResponse.json({ error: 'Invalid property status' }, { status: 400 });
      }
      updatePayload.status = status;
      if (status === 'draft') {
        updatePayload.rejection_reason =
          rejectionReason || 'Property did not meet our listing requirements.';
      } else if (status === 'active') {
        updatePayload.rejection_reason = null;
      }
    }

    if (name !== undefined && name !== null) {
      const n = String(name).trim();
      updatePayload.name = n;
      if (title === undefined || title === null || String(title).trim() === '') {
        updatePayload.title = n;
      }
    }
    if (title !== undefined && title !== null && String(title).trim() !== '') {
      updatePayload.title = String(title).trim();
    }
    if (location !== undefined && location !== null) {
      updatePayload.location = String(location).trim();
    }
    if (price !== undefined && price !== null && price !== '') {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) {
        return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
      }
      updatePayload.price = p;
    }
    if (description !== undefined && description !== null) {
      updatePayload.description = String(description);
    }
    if (bedrooms !== undefined && bedrooms !== null && bedrooms !== '') {
      const v = parseInt(String(bedrooms), 10);
      if (Number.isFinite(v) && v >= 0) updatePayload.bedrooms = v;
    }
    if (bathrooms !== undefined && bathrooms !== null && bathrooms !== '') {
      const v = parseFloat(String(bathrooms));
      if (Number.isFinite(v) && v >= 0) updatePayload.bathrooms = v;
    }
    if (guests !== undefined && guests !== null && guests !== '') {
      const v = parseInt(String(guests), 10);
      if (Number.isFinite(v) && v >= 0) updatePayload.guests = v;
    }
    if (beds !== undefined && beds !== null && beds !== '') {
      const v = parseInt(String(beds), 10);
      if (Number.isFinite(v) && v >= 0) updatePayload.beds = v;
    }

    const keys = Object.keys(updatePayload).filter((k) => k !== 'updated_at');
    if (keys.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { error } = await serviceSupabase.from('properties').update(updatePayload).eq('id', propertyId);

    if (error) {
      throw error;
    }

    void invalidatePropertyListingCaches(propertyId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to update property:', error);
    const message = error instanceof Error ? error.message : 'Failed to update property';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const propertyId = request.nextUrl.searchParams.get('propertyId');
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId query parameter is required' }, { status: 400 });
    }

    const serviceSupabase = createSupabaseForAdminApi(accessTokenFromRequest(request));
    const { error } = await serviceSupabase.from('properties').delete().eq('id', propertyId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete property:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete property';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
