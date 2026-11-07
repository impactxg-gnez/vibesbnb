import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest';
import { isReferralAffiliateEnabled } from '@/lib/referrals/config';
import { claimReferralCode } from '@/lib/referrals/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isReferralAffiliateEnabled()) {
    return NextResponse.json({ ok: false, reason: 'disabled' });
  }
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code : '';
  try {
    const result = await claimReferralCode({
      userId: user.id,
      email: user.email || '',
      code,
      createdAt: user.created_at,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.warn('[referrals] claim failed', error);
    return NextResponse.json({ ok: false, reason: 'unavailable' });
  }
}
