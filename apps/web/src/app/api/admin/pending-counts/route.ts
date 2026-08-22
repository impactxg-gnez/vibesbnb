import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export const dynamic = 'force-dynamic';

/** Lightweight badge counts for AdminLayout — no full-table scans. */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const supabase = createServiceClient();

    const [
      { count: pendingPropertyApprovals, error: propErr },
      { count: pendingHostApplications, error: hostErr },
      { count: pendingProfilePictures, error: picErr },
      { count: pendingDispensaries, error: dispErr },
    ] = await Promise.all([
      supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      supabase
        .from('pending_host_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('pending_profile_pictures')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('dispensaries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    if (propErr) console.warn('[admin/pending-counts] properties:', propErr.message);
    if (hostErr) console.warn('[admin/pending-counts] hosts:', hostErr.message);
    if (picErr) console.warn('[admin/pending-counts] pictures:', picErr.message);
    if (dispErr) console.warn('[admin/pending-counts] dispensaries:', dispErr.message);

    return NextResponse.json({
      listings: { pendingApproval: pendingPropertyApprovals ?? 0 },
      hosts: { pending: pendingHostApplications ?? 0 },
      profilePictures: { pending: pendingProfilePictures ?? 0 },
      dispensaries: { pending: pendingDispensaries ?? 0 },
    });
  } catch (error: unknown) {
    console.error('[admin/pending-counts]', error);
    const message = error instanceof Error ? error.message : 'Failed to load pending counts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
