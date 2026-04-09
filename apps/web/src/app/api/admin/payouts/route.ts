import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

type PayoutAccountStatus =
  | 'pending_verification'
  | 'verified'
  | 'suspended';

function toUiStatus(s: PayoutAccountStatus): 'pending' | 'approved' | 'rejected' {
  if (s === 'verified') return 'approved';
  if (s === 'suspended') return 'rejected';
  return 'pending';
}

function fromUiStatus(
  s: 'approved' | 'rejected'
): 'verified' | 'suspended' {
  return s === 'approved' ? 'verified' : 'suspended';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const service = createServiceClient();
    const { data: accounts, error: accErr } = await service
      .from('payout_accounts')
      .select(
        'id, user_id, account_holder_name, bank_name, status, created_at, updated_at'
      )
      .order('created_at', { ascending: false });

    if (accErr) throw accErr;

    if (!accounts?.length) {
      return NextResponse.json({ payouts: [] });
    }

    const userIds = [...new Set(accounts.map((a) => a.user_id as string))];
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, host_email')
      .in('id', userIds);

    const profileById = new Map(
      (profiles || []).map((p) => [p.id as string, p])
    );

    const { data: bookings } = await service
      .from('bookings')
      .select('host_id, total_price, status')
      .in('host_id', userIds);

    const earnings = new Map<string, number>();
    for (const b of bookings || []) {
      const st = String(b.status || '');
      if (st === 'cancelled' || st === 'rejected') continue;
      const hid = b.host_id as string;
      earnings.set(
        hid,
        (earnings.get(hid) || 0) + Number(b.total_price || 0)
      );
    }

    const payouts = accounts.map((acc) => {
      const uid = acc.user_id as string;
      const prof = profileById.get(uid);
      const rawStatus = acc.status as PayoutAccountStatus;
      return {
        id: acc.id,
        host_id: uid,
        host_name:
          (acc.account_holder_name as string) ||
          prof?.full_name ||
          'Host',
        host_email:
          (prof?.host_email as string) ||
          `host-${uid.substring(0, 8)}…`,
        property_name: 'All listings',
        amount: earnings.get(uid) || 0,
        bank_name: acc.bank_name as string,
        requested_at: acc.created_at as string,
        status: toUiStatus(rawStatus),
        account_status: rawStatus,
      };
    });

    return NextResponse.json({ payouts });
  } catch (e: unknown) {
    console.error('[admin/payouts GET]', e);
    const message = e instanceof Error ? e.message : 'Failed to load payouts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const { payoutAccountId, status } = body as {
      payoutAccountId?: string;
      status?: 'approved' | 'rejected';
    };

    if (!payoutAccountId || !status) {
      return NextResponse.json(
        { error: 'payoutAccountId and status are required' },
        { status: 400 }
      );
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const dbStatus = fromUiStatus(status);
    const service = createServiceClient();
    const updates: Record<string, unknown> = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };
    if (dbStatus === 'verified') {
      updates.verified_at = new Date().toISOString();
    }

    const { error } = await service
      .from('payout_accounts')
      .update(updates)
      .eq('id', payoutAccountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('[admin/payouts PATCH]', e);
    const message = e instanceof Error ? e.message : 'Failed to update payout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
