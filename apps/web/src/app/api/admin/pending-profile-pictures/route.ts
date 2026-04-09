import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const service = createServiceClient();
    const { data: rows, error } = await service
      .from('pending_profile_pictures')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    const userIds = [...new Set((rows || []).map((p) => p.user_id))];
    const nameByUser = new Map<string, string>();
    const roleByUser = new Map<string, string | undefined>();
    if (userIds.length > 0) {
      const { data: profiles } = await service
        .from('profiles')
        .select('id, full_name, role')
        .in('id', userIds);
      for (const p of profiles || []) {
        nameByUser.set(p.id as string, (p.full_name as string) || 'Unknown User');
        roleByUser.set(p.id as string, p.role as string | undefined);
      }
    }

    const enriched = (rows || []).map((pic) => ({
      ...pic,
      user_name: nameByUser.get(pic.user_id) || 'Unknown User',
      user_email: `User ${String(pic.user_id).substring(0, 8)}`,
      user_role: roleByUser.get(pic.user_id),
    }));
    return NextResponse.json({ pictures: enriched });
  } catch (e: unknown) {
    console.error('[pending-profile-pictures GET]', e);
    const message = e instanceof Error ? e.message : 'Failed to load profile pictures';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const {
      pictureId,
      userId,
      action,
      imageUrl,
      rejectionReason,
    } = body as {
      pictureId?: string;
      userId?: string;
      action?: 'approve' | 'reject';
      imageUrl?: string;
      rejectionReason?: string;
    };

    if (!pictureId || !userId || !action) {
      return NextResponse.json(
        { error: 'pictureId, userId, and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'approve' && !imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required for approval' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const now = new Date().toISOString();

    if (action === 'approve') {
      const { error: u1 } = await service
        .from('pending_profile_pictures')
        .update({
          status: 'approved',
          reviewed_at: now,
          reviewed_by: auth.user.id,
        })
        .eq('id', pictureId);

      if (u1) throw u1;

      const { error: u2 } = await service.from('profiles').upsert(
        {
          id: userId,
          avatar_url: imageUrl,
          avatar_status: 'approved',
          pending_avatar_url: null,
          updated_at: now,
        },
        { onConflict: 'id' }
      );

      if (u2) console.error('[pending-profile-pictures] profile upsert:', u2);
    } else {
      const { error: u1 } = await service
        .from('pending_profile_pictures')
        .update({
          status: 'rejected',
          rejection_reason:
            rejectionReason || 'Image does not meet our community guidelines.',
          reviewed_at: now,
          reviewed_by: auth.user.id,
        })
        .eq('id', pictureId);

      if (u1) throw u1;

      const { error: u2 } = await service.from('profiles').upsert(
        {
          id: userId,
          avatar_status: 'rejected',
          pending_avatar_url: null,
          updated_at: now,
        },
        { onConflict: 'id' }
      );

      if (u2) console.error('[pending-profile-pictures] profile upsert:', u2);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('[pending-profile-pictures PATCH]', e);
    const message = e instanceof Error ? e.message : 'Failed to update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
