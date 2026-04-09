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

    const { propertyId, status, rejectionReason } = await request.json();

    if (!propertyId || !status) {
      return NextResponse.json({ error: 'Property ID and status are required' }, { status: 400 });
    }

    if (!['active', 'draft', 'inactive', 'pending_approval'].includes(status)) {
      return NextResponse.json({ error: 'Invalid property status' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const updatePayload: Record<string, any> = { status };

    if (status === 'draft') {
      updatePayload.rejection_reason = rejectionReason || 'Property did not meet our listing requirements.';
    } else if (status === 'active') {
      updatePayload.rejection_reason = null;
    }

    const { error } = await serviceSupabase
      .from('properties')
      .update(updatePayload)
      .eq('id', propertyId);

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
