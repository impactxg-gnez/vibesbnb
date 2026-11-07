import { NextRequest, NextResponse } from 'next/server';
import { isReferralAffiliateEnabled } from '@/lib/referrals/config';
import { adjustmentForBooking } from '@/lib/referrals/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isReferralAffiliateEnabled()) {
    return NextResponse.json({ enabled: false, creditsApplied: 0, friendDiscount: 0 });
  }
  const bookingId = request.nextUrl.searchParams.get('bookingId') || '';
  if (!bookingId) {
    return NextResponse.json({ enabled: true, creditsApplied: 0, friendDiscount: 0 });
  }
  try {
    return NextResponse.json(await adjustmentForBooking(bookingId));
  } catch (error) {
    console.warn('[referrals] adjustment failed', error);
    return NextResponse.json({ enabled: true, creditsApplied: 0, friendDiscount: 0 });
  }
}
