import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateHostRequest } from '@/lib/auth/authenticateHostRequest';

function sumAmount(
  rows: { host_amount?: number | null; status?: string | null }[],
  status: string
): number {
  return rows
    .filter((r) => r.status === status)
    .reduce((sum, r) => sum + (Number(r.host_amount) || 0), 0);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateHostRequest(request);
    if ('response' in auth) return auth.response;

    const service = createServiceClient();
    const { data: rows, error } = await service
      .from('host_payouts')
      .select(
        'id, booking_id, host_id, property_id, guest_total, platform_fee, host_amount, currency, status, check_in, check_out, property_name, paid_at, transfer_ref, notes, cancelled_at, cancel_reason, created_at, updated_at'
      )
      .eq('host_id', auth.hostId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('host_payouts')) {
        return NextResponse.json({
          summary: {
            pendingTotal: 0,
            paidTotal: 0,
            cancelledTotal: 0,
            cancelledCount: 0,
          },
          pending: [],
          paid: [],
          cancelled: [],
          migrationRequired: true,
        });
      }
      throw error;
    }

    const list = rows || [];
    const pending = list.filter((r) => r.status === 'pending');
    const paid = list.filter((r) => r.status === 'paid');
    const cancelled = list.filter((r) => r.status === 'cancelled');

    return NextResponse.json({
      summary: {
        pendingTotal: sumAmount(list, 'pending'),
        paidTotal: sumAmount(list, 'paid'),
        cancelledTotal: sumAmount(list, 'cancelled'),
        cancelledCount: cancelled.length,
      },
      pending,
      paid,
      cancelled,
    });
  } catch (e: unknown) {
    console.error('[api/host/payouts GET]', e);
    const message = e instanceof Error ? e.message : 'Failed to load payouts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
