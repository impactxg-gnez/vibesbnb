import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export const dynamic = 'force-dynamic';

function startDateForPeriod(period: string, now: Date): Date {
  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const period =
      request.nextUrl.searchParams.get('period') || 'month';
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }

    const service = createServiceClient();
    const now = new Date();
    const startDate = startDateForPeriod(period, now);

    const { data: bookingsData, error } = await service
      .from('bookings')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const breakdown: Record<
      string,
      { income: number; refunds: number; bookings: number }
    > = {};

    let totalIncome = 0;
    let totalRefunds = 0;

    (bookingsData || []).forEach((booking) => {
      const date = new Date(booking.created_at).toLocaleDateString();
      if (!breakdown[date]) {
        breakdown[date] = { income: 0, refunds: 0, bookings: 0 };
      }

      if (booking.status === 'cancelled') {
        breakdown[date].refunds += Number(booking.total_price || 0);
        totalRefunds += Number(booking.total_price || 0);
      } else {
        breakdown[date].income += Number(booking.total_price || 0);
        totalIncome += Number(booking.total_price || 0);
      }
      breakdown[date].bookings += 1;
    });

    const breakdownArray = Object.entries(breakdown).map(([date, data]) => ({
      date,
      ...data,
    }));

    return NextResponse.json({
      period,
      total_income: totalIncome,
      total_refunds: totalRefunds,
      net_income: totalIncome - totalRefunds,
      bookings_count: bookingsData?.length || 0,
      breakdown: breakdownArray,
    });
  } catch (e: unknown) {
    console.error('[admin/reports]', e);
    const message = e instanceof Error ? e.message : 'Failed to load reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
