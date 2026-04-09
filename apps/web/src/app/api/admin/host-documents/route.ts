import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const service = createServiceClient();
    const { data: rows, error } = await service
      .from('host_verification_documents')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    const userIds = [...new Set((rows || []).map((r) => r.user_id as string))];
    const nameByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await service
        .from('profiles')
        .select('id, full_name, host_email')
        .in('id', userIds);
      for (const p of profiles || []) {
        nameByUser.set(
          p.id as string,
          (p.full_name as string) || 'Unknown'
        );
      }
    }

    // Private bucket: admins open files via GET .../host-documents/signed-url?documentId=...
    const documents = (rows || []).map((row) => ({
      ...row,
      host_name: nameByUser.get(row.user_id as string) || 'Unknown',
    }));

    return NextResponse.json({ documents });
  } catch (e: unknown) {
    console.error('[admin/host-documents GET]', e);
    const message =
      e instanceof Error ? e.message : 'Failed to load verification documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const { documentId, status, rejectionReason } = body as {
      documentId?: string;
      status?: 'approved' | 'rejected';
      rejectionReason?: string;
    };

    if (!documentId || !status) {
      return NextResponse.json(
        { error: 'documentId and status are required' },
        { status: 400 }
      );
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const service = createServiceClient();
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status,
      reviewed_at: now,
      reviewed_by: auth.user.id,
    };
    if (status === 'rejected') {
      updates.rejection_reason =
        rejectionReason || 'Document did not meet verification requirements.';
    } else {
      updates.rejection_reason = null;
    }

    const { error } = await service
      .from('host_verification_documents')
      .update(updates)
      .eq('id', documentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('[admin/host-documents PATCH]', e);
    const message =
      e instanceof Error ? e.message : 'Failed to update verification document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
