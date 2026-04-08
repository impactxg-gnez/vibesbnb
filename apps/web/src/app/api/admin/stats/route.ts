import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin';

    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // Note: We can't directly query auth.users table from the client
    // In production, you'd want to create a users table or use a database function
    // For now, we'll estimate from bookings and provide fallback data
    
    // Get users from bookings (unique user_ids)
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('user_id');

    const uniqueUserIds = new Set(bookingsData?.map(b => b.user_id) || []);
    const totalUsersCount = uniqueUserIds.size;

    // Get users from last 24 hours (from bookings)
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const { data: bookings24h } = await supabase
      .from('bookings')
      .select('user_id')
      .gte('created_at', last24Hours.toISOString());

    const uniqueUsers24h = new Set(bookings24h?.map(b => b.user_id) || []);
    const users24hCount = uniqueUsers24h.size;

    // Get users from last 30 days
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const { data: bookings30d } = await supabase
      .from('bookings')
      .select('user_id')
      .gte('created_at', last30Days.toISOString());

    const uniqueUsers30d = new Set(bookings30d?.map(b => b.user_id) || []);
    const users30dCount = uniqueUsers30d.size;

    // Get listings stats
    const { count: totalListings } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    const { count: listings24h } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24Hours.toISOString());

    const { count: listings30d } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last30Days.toISOString());

    // Get reservations stats
    const { count: totalReservations } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    const { count: reservations24h } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24Hours.toISOString());

    const { count: reservations30d } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last30Days.toISOString());

    // Get dispensaries stats
    const { count: totalDispensaries } = await supabase
      .from('dispensaries')
      .select('*', { count: 'exact', head: true });

    const { count: pendingDispensaries } = await supabase
      .from('dispensaries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get host applications stats
    let totalHostApplications = 0;
    let pendingHostApplications = 0;
    
    try {
      const { count: totalHosts } = await supabase
        .from('pending_host_applications')
        .select('*', { count: 'exact', head: true });
      totalHostApplications = totalHosts || 0;

      const { count: pendingHosts } = await supabase
        .from('pending_host_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      pendingHostApplications = pendingHosts || 0;
    } catch (e) {
      // Table might not exist yet
      console.warn('pending_host_applications table not found');
    }

    // Get pending property approvals
    let pendingPropertyApprovals = 0;
    try {
      const { count: pendingProps } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');
      pendingPropertyApprovals = pendingProps || 0;
    } catch (e) {
      console.warn('Error getting pending property count');
    }

    // Get pending profile pictures
    let pendingProfilePictures = 0;
    try {
      const { count: pendingPics } = await supabase
        .from('pending_profile_pictures')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      pendingProfilePictures = pendingPics || 0;
    } catch (e) {
      console.warn('pending_profile_pictures table not found');
    }

    return NextResponse.json({
      users: {
        total: totalUsersCount || 0,
        last24Hours: users24hCount || 0,
        last30Days: users30dCount || 0,
      },
      listings: {
        total: totalListings || 0,
        last24Hours: listings24h || 0,
        last30Days: listings30d || 0,
        pendingApproval: pendingPropertyApprovals,
      },
      reservations: {
        total: totalReservations || 0,
        last24Hours: reservations24h || 0,
        last30Days: reservations30d || 0,
      },
      dispensaries: {
        total: totalDispensaries || 0,
        pending: pendingDispensaries || 0,
      },
      hosts: {
        total: totalHostApplications,
        pending: pendingHostApplications,
      },
      profilePictures: {
        pending: pendingProfilePictures,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({
      error: error.message || 'Failed to load admin stats',
    }, { status: 500 });
  }
}

