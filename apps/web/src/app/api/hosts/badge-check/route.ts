import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  qualifiesForSuperBud,
  resolveHostBadge,
  type HostBadge,
  type HostReviewStats,
} from '@/lib/hostBadge';
import { fetchHostReviewStats } from '@/lib/hostReviewStats';

/**
 * Returns resolved host badge + review stats. Promotes vibesetter → superbud when eligible.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hostId = typeof body.hostId === 'string' ? body.hostId.trim() : '';
    if (!hostId) {
      return NextResponse.json({ error: 'hostId is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, role, host_badge')
      .eq('id', hostId)
      .maybeSingle();

    if (profileErr) {
      console.error('[hosts/badge-check] profile', profileErr);
      return NextResponse.json({ error: 'Failed to load host profile' }, { status: 500 });
    }

    const isHost =
      profile?.role === 'host' ||
      (await admin.from('properties').select('id').eq('host_id', hostId).limit(1)).data?.length;

    if (!isHost) {
      return NextResponse.json({ badge: null, stats: { reviewCount: 0, avgRating: 0 } });
    }

    const stats: HostReviewStats = await fetchHostReviewStats(admin, hostId);
    const storedBadge = profile?.host_badge as HostBadge | null | undefined;

    let badge = resolveHostBadge(storedBadge, stats, true);

    if (
      storedBadge === 'vibesetter' &&
      badge === 'superbud' &&
      qualifiesForSuperBud(stats)
    ) {
      const { error: updateErr } = await admin
        .from('profiles')
        .update({ host_badge: 'superbud', updated_at: new Date().toISOString() })
        .eq('id', hostId);

      if (updateErr) {
        console.warn('[hosts/badge-check] promote failed:', updateErr.message);
      }
    }

    return NextResponse.json({ badge, stats });
  } catch (e) {
    console.error('[hosts/badge-check]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
