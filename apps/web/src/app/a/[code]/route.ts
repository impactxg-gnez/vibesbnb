import { NextRequest, NextResponse } from 'next/server';
import { AFFILIATE_CLICK_COOKIE, isReferralAffiliateEnabled, referralAffiliateConfig } from '@/lib/referrals/config';
import { recordAffiliateClick } from '@/lib/referrals/store';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const home = new URL('/', request.url);
  if (!isReferralAffiliateEnabled()) {
    return NextResponse.redirect(home);
  }
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  let recorded: Awaited<ReturnType<typeof recordAffiliateClick>> = null;
  try {
    recorded = await recordAffiliateClick({
      code: params.code,
      ip,
      userAgent: request.headers.get('user-agent') || '',
    });
  } catch (error) {
    console.warn('[affiliates] click record failed', error);
  }
  const response = NextResponse.redirect(home);
  if (recorded) {
    response.cookies.set(AFFILIATE_CLICK_COOKIE, recorded.cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: referralAffiliateConfig.affiliateTrackingWindowDays * 24 * 60 * 60,
    });
  }
  return response;
}
