import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateHostRequest } from '@/lib/auth/authenticateHostRequest';
import { todayLocalYmd } from '@/lib/dateUtils';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateHostRequest(request);
    if ('response' in auth) return auth.response;

    const hostId = auth.hostId;
    const service = createServiceClient();
    const today = todayLocalYmd();
    const yearStart = `${new Date().getFullYear()}-01-01`;

    const { count: propertyCount } = await service
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', hostId);

    const { count: activeListings } = await service
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', hostId)
      .eq('status', 'active');

    const { data: bookings } = await service
      .from('bookings')
      .select(
        'id, property_name, check_in, check_out, status, payment_status, total_price, guest_name, created_at'
      )
      .eq('host_id', hostId)
      .order('check_in', { ascending: true });

    const allBookings = bookings || [];
    const pendingApprovals = allBookings
      .filter((b) => b.status === 'pending_approval' || b.status === 'pending')
      .slice(0, 8);

    const upcomingStays = allBookings.filter((b) => {
      const checkIn = String(b.check_in || '').split('T')[0];
      return (
        checkIn >= today &&
        ['accepted', 'confirmed', 'completed'].includes(String(b.status))
      );
    });

    let pendingPayoutTotal = 0;
    let paidYtdTotal = 0;
    let cancelledPayoutCount = 0;
    let pendingPayouts: {
      id: string;
      property_name: string | null;
      host_amount: number;
      check_in: string | null;
      check_out: string | null;
    }[] = [];
    let migrationRequired = false;

    const { data: payouts, error: payoutError } = await service
      .from('host_payouts')
      .select(
        'id, status, host_amount, property_name, check_in, check_out, paid_at, created_at'
      )
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (payoutError?.message?.includes('host_payouts')) {
      migrationRequired = true;
    } else if (!payoutError && payouts) {
      pendingPayoutTotal = payouts
        .filter((p) => p.status === 'pending')
        .reduce((s, p) => s + (Number(p.host_amount) || 0), 0);
      paidYtdTotal = payouts
        .filter((p) => {
          if (p.status !== 'paid') return false;
          const paidAt = String(p.paid_at || '').split('T')[0];
          return paidAt >= yearStart;
        })
        .reduce((s, p) => s + (Number(p.host_amount) || 0), 0);
      cancelledPayoutCount = payouts.filter((p) => p.status === 'cancelled').length;
      pendingPayouts = payouts
        .filter((p) => p.status === 'pending')
        .slice(0, 8)
        .map((p) => ({
          id: p.id as string,
          property_name: (p.property_name as string) || null,
          host_amount: Number(p.host_amount) || 0,
          check_in: (p.check_in as string) || null,
          check_out: (p.check_out as string) || null,
        }));
    }

    return NextResponse.json({
      stats: {
        totalProperties: propertyCount || 0,
        activeListings: activeListings || 0,
        upcomingStays: upcomingStays.length,
        pendingApprovals: pendingApprovals.length,
        pendingPayoutTotal,
        paidYtdTotal,
        cancelledPayoutCount,
      },
      pendingApprovals: pendingApprovals.map((b) => ({
        id: b.id,
        property_name: b.property_name,
        guest_name: b.guest_name,
        check_in: b.check_in,
        check_out: b.check_out,
        total_price: b.total_price,
        status: b.status,
      })),
      pendingPayouts,
      upcomingStays: upcomingStays.slice(0, 6).map((b) => ({
        id: b.id,
        property_name: b.property_name,
        guest_name: b.guest_name,
        check_in: b.check_in,
        check_out: b.check_out,
        status: b.status,
        payment_status: b.payment_status,
      })),
      migrationRequired,
    });
  } catch (e: unknown) {
    console.error('[api/host/dashboard GET]', e);
    const message = e instanceof Error ? e.message : 'Failed to load dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
