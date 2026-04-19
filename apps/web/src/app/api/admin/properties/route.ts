import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const status = request.nextUrl.searchParams.get('status') || 'all';
    const serviceSupabase = createServiceClient();

    let query = serviceSupabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ properties: data || [] });
  } catch (error: any) {
    console.error('Failed to load admin properties:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load properties' },
      { status: 500 }
    );
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

    const serviceSupabase = createServiceClient();
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update property:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update property' },
      { status: 500 }
    );
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

    const serviceSupabase = createServiceClient();
    const { error } = await serviceSupabase.from('properties').delete().eq('id', propertyId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete property:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete property' },
      { status: 500 }
    );
  }
}
