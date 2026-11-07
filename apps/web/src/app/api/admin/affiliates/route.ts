import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { isReferralAffiliateEnabled } from '@/lib/referrals/config';
import { adminAffiliateBoard, createAffiliate, markAffiliatePayoutPaid } from '@/lib/referrals/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isReferralAffiliateEnabled()) {
    return NextResponse.json({ enabled: false, rows: [], payouts: [] });
  }
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;
  try {
    return NextResponse.json(await adminAffiliateBoard());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load affiliates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isReferralAffiliateEnabled()) {
    return NextResponse.json({ error: 'Referral and affiliate is off.' }, { status: 404 });
  }
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const result = await createAffiliate({
    name: typeof body?.name === 'string' ? body.name : '',
    email: typeof body?.email === 'string' ? body.email : '',
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  if (!isReferralAffiliateEnabled()) {
    return NextResponse.json({ error: 'Referral and affiliate is off.' }, { status: 404 });
  }
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const payoutId = typeof body?.payoutId === 'string' ? body.payoutId : '';
  if (!payoutId) return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });
  const result = await markAffiliatePayoutPaid(payoutId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
