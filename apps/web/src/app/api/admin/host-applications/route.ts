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
      .from('pending_host_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ applications: data || [] });
  } catch (error: any) {
    console.error('Failed to load host applications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load host applications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const { applicationId, status, rejectionReason } = await request.json();

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Application ID and status are required' }, { status: 400 });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const updatePayload: Record<string, unknown> = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    };

    if (status === 'rejected') {
      updatePayload.rejection_reason = rejectionReason || 'Application did not meet the current requirements.';
    }

    const { error } = await serviceSupabase
      .from('pending_host_applications')
      .update(updatePayload)
      .eq('id', applicationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update host application:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update host application' },
      { status: 500 }
    );
  }
}
