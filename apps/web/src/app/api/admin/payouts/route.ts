import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { markHostPayoutPaid } from '@/lib/hostPayouts';

type PayoutAccountStatus =
  | 'pending_verification'
  | 'verified'
  | 'suspended';

function toUiStatus(s: PayoutAccountStatus): 'pending' | 'approved' | 'rejected' {
  if (s === 'verified') return 'approved';
  if (s === 'suspended') return 'rejected';
  return 'pending';
}

function fromUiStatus(s: 'approved' | 'rejected'): 'verified' | 'suspended' {
  return s === 'approved' ? 'verified' : 'suspended';
}

async function getBankAccounts() {
  const service = createServiceClient();
  const { data: accounts, error: accErr } = await service
    .from('payout_accounts')
    .select(
      'id, user_id, account_holder_name, bank_name, status, created_at, updated_at'
    )
    .order('created_at', { ascending: false });

  if (accErr) throw accErr;

  if (!accounts?.length) {
    return { payouts: [] as unknown[] };
  }

  const userIds = [...new Set(accounts.map((a) => a.user_id as string))];
  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, host_email')
    .in('id', userIds);

  const profileById = new Map((profiles || []).map((p) => [p.id as string, p]));

  const { data: hostPayouts } = await service
    .from('host_payouts')
    .select('host_id, host_amount, status')
    .in('host_id', userIds);

  const pendingByHost = new Map<string, number>();
  for (const p of hostPayouts || []) {
    if (p.status !== 'pending') continue;
    const hid = p.host_id as string;
    pendingByHost.set(hid, (pendingByHost.get(hid) || 0) + (Number(p.host_amount) || 0));
  }

  const payouts = accounts.map((acc) => {
    const uid = acc.user_id as string;
    const prof = profileById.get(uid);
    const rawStatus = acc.status as PayoutAccountStatus;
    return {
      id: acc.id,
      host_id: uid,
      host_name: (acc.account_holder_name as string) || prof?.full_name || 'Host',
      host_email: (prof?.host_email as string) || `host-${uid.substring(0, 8)}…`,
      property_name: 'All listings',
      amount: pendingByHost.get(uid) || 0,
      bank_name: acc.bank_name as string,
      requested_at: acc.created_at as string,
      status: toUiStatus(rawStatus),
      account_status: rawStatus,
    };
  });

  return { payouts };
}

async function getTransferQueue(statusFilter: string | null) {
  const service = createServiceClient();
  let query = service
    .from('host_payouts')
    .select(
      'id, booking_id, host_id, property_id, guest_total, platform_fee, host_fee, host_amount, currency, status, check_in, check_out, property_name, paid_at, transfer_ref, notes, cancelled_at, cancel_reason, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter && ['pending', 'paid', 'cancelled'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  const { data: rows, error } = await query;
  if (error) {
    if (error.message?.includes('host_payouts')) {
      return { transfers: [], migrationRequired: true };
    }
    throw error;
  }

  const list = rows || [];
  const hostIds = [...new Set(list.map((r) => r.host_id as string).filter(Boolean))];
  const { data: profiles } = hostIds.length
    ? await service.from('profiles').select('id, full_name, host_email').in('id', hostIds)
    : { data: [] as { id: string; full_name?: string; host_email?: string }[] };

  const profileById = new Map((profiles || []).map((p) => [p.id as string, p]));

  const { data: accounts } = hostIds.length
    ? await service
        .from('payout_accounts')
        .select('user_id, bank_name, account_holder_name, status')
        .in('user_id', hostIds)
    : { data: [] as { user_id: string; bank_name?: string; account_holder_name?: string; status?: string }[] };

  const accountByHost = new Map((accounts || []).map((a) => [a.user_id as string, a]));

  const transfers = list.map((r) => {
    const hid = r.host_id as string;
    const prof = profileById.get(hid);
    const acct = accountByHost.get(hid);
    return {
      id: r.id,
      booking_id: r.booking_id,
      host_id: hid,
      host_name: acct?.account_holder_name || prof?.full_name || 'Host',
      host_email: prof?.host_email || null,
      property_name: r.property_name,
      check_in: r.check_in,
      check_out: r.check_out,
      guest_total: Number(r.guest_total) || 0,
      platform_fee: Number(r.platform_fee) || 0,
      host_fee: Number((r as { host_fee?: unknown }).host_fee) || 0,
      host_amount: Number(r.host_amount) || 0,
      currency: r.currency || 'USD',
      status: r.status,
      paid_at: r.paid_at,
      transfer_ref: r.transfer_ref,
      notes: r.notes,
      cancelled_at: r.cancelled_at,
      cancel_reason: r.cancel_reason,
      created_at: r.created_at,
      bank_name: acct?.bank_name || null,
      bank_status: acct?.status || null,
    };
  });

  return { transfers };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const type = request.nextUrl.searchParams.get('type') || 'accounts';
    const status = request.nextUrl.searchParams.get('status');

    if (type === 'transfers') {
      const payload = await getTransferQueue(status);
      return NextResponse.json(payload);
    }

    const payload = await getBankAccounts();
    return NextResponse.json(payload);
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
    const action = body?.action as string | undefined;

    // Transfer queue: mark host_payouts as paid
    if (action === 'mark_paid') {
      const payoutId = body?.payoutId as string | undefined;
      if (!payoutId) {
        return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });
      }
      const service = createServiceClient();
      const result = await markHostPayoutPaid(service, payoutId, auth.user.id, {
        transferRef: typeof body?.transferRef === 'string' ? body.transferRef : undefined,
        notes: typeof body?.notes === 'string' ? body.notes : undefined,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error || 'Failed to mark paid' }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // Bank account verification (existing)
    const { payoutAccountId, status } = body as {
      payoutAccountId?: string;
      status?: 'approved' | 'rejected';
    };

    if (!payoutAccountId || !status) {
      return NextResponse.json(
        { error: 'payoutAccountId and status are required (or action=mark_paid with payoutId)' },
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
