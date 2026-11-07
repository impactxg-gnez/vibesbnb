import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest';
import { isReferralAffiliateEnabled } from '@/lib/referrals/config';
import { previewAdjustment } from '@/lib/referrals/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isReferralAffiliateEnabled()) {
    return NextResponse.json({ enabled: false, creditsApplied: 0, friendDiscount: 0 });
  }
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ enabled: true, creditsApplied: 0, friendDiscount: 0 });
  }
  const body = await request.json().catch(() => ({}));
  const serviceFee = Math.max(0, Number(body?.serviceFee) || 0);
  try {
    const preview = await previewAdjustment(user.id, serviceFee);
    return NextResponse.json(preview);
  } catch (error) {
    console.warn('[referrals] preview failed', error);
    return NextResponse.json({ enabled: true, creditsApplied: 0, friendDiscount: 0 });
  }
}
