import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const supabase = createServiceClient();

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const iso24 = last24Hours.toISOString();
    const iso30 = last30Days.toISOString();

    // Registered users from profiles (not booking-derived)
    const { count: totalUsersCount, error: profilesTotalErr } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: users24h, error: profiles24Err } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', iso24);

    const { count: users30d, error: profiles30Err } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', iso30);

    if (profilesTotalErr) console.error('[admin/stats] profiles total:', profilesTotalErr);
    if (profiles24Err) console.error('[admin/stats] profiles 24h:', profiles24Err);
    if (profiles30Err) console.error('[admin/stats] profiles 30d:', profiles30Err);

    const { count: totalListings, error: listTotalErr } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    const { count: listings24h, error: list24Err } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', iso24);

    const { count: listings30d, error: list30Err } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', iso30);

    if (listTotalErr || list24Err || list30Err) {
      console.error('[admin/stats] listings count error:', listTotalErr || list24Err || list30Err);
    }

    const { count: totalReservations, error: resTotalErr } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    const { count: reservations24h, error: res24Err } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', iso24);

    const { count: reservations30d, error: res30Err } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', iso30);

    if (resTotalErr || res24Err || res30Err) {
      console.error('[admin/stats] bookings count error:', resTotalErr || res24Err || res30Err);
    }

    const { count: totalDispensaries } = await supabase
      .from('dispensaries')
      .select('*', { count: 'exact', head: true });

    const { count: pendingDispensaries } = await supabase
      .from('dispensaries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    let totalHostApplications = 0;
    let pendingHostApplications = 0;

    const { count: totalHosts, error: hostTotalErr } = await supabase
      .from('pending_host_applications')
      .select('*', { count: 'exact', head: true });

    if (!hostTotalErr) totalHostApplications = totalHosts || 0;
    else console.warn('[admin/stats] pending_host_applications total:', hostTotalErr.message);

    const { count: pendingHosts, error: hostPendingErr } = await supabase
      .from('pending_host_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (!hostPendingErr) pendingHostApplications = pendingHosts || 0;
    else console.warn('[admin/stats] pending_host_applications pending:', hostPendingErr.message);

    let pendingPropertyApprovals = 0;
    const { count: pendingProps, error: propPendingErr } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_approval');

    if (!propPendingErr) pendingPropertyApprovals = pendingProps || 0;
    else console.warn('[admin/stats] pending properties:', propPendingErr.message);

    let pendingProfilePictures = 0;
    const { count: pendingPics, error: picErr } = await supabase
      .from('pending_profile_pictures')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (!picErr) pendingProfilePictures = pendingPics || 0;
    else console.warn('[admin/stats] pending_profile_pictures:', picErr.message);

    return NextResponse.json({
      users: {
        total: totalUsersCount ?? 0,
        last24Hours: users24h ?? 0,
        last30Days: users30d ?? 0,
      },
      listings: {
        total: totalListings ?? 0,
        last24Hours: listings24h ?? 0,
        last30Days: listings30d ?? 0,
        pendingApproval: pendingPropertyApprovals,
      },
      reservations: {
        total: totalReservations ?? 0,
        last24Hours: reservations24h ?? 0,
        last30Days: reservations30d ?? 0,
      },
      dispensaries: {
        total: totalDispensaries ?? 0,
        pending: pendingDispensaries ?? 0,
      },
      hosts: {
        total: totalHostApplications,
        pending: pendingHostApplications,
      },
      profilePictures: {
        pending: pendingProfilePictures,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching admin stats:', error);
    const message = error instanceof Error ? error.message : 'Failed to load admin stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
