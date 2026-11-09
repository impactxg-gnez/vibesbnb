import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest';
import { isReferralAffiliateEnabled, REFERRAL_CODE_COOKIE } from '@/lib/referrals/config';
import { getAccountSummary } from '@/lib/referrals/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isReferralAffiliateEnabled()) {
    return NextResponse.json({ enabled: false });
  }
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await getAccountSummary({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      user_metadata: user.user_metadata as { referral_code?: string },
      cookieCode: request.cookies.get(REFERRAL_CODE_COOKIE)?.value || null,
    });

    if (summary && 'link' in summary && summary.link) {
      summary.link = summary.link.replace(/https?:\/\/[^/]*vercel\.app/i, 'https://vibesbnb.com');
      if (summary.hostLink) {
        summary.hostLink = summary.hostLink.replace(/https?:\/\/[^/]*vercel\.app/i, 'https://vibesbnb.com');
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.warn('[referrals] account summary failed', error);
    return NextResponse.json({
      enabled: true,
      code: '',
      link: '',
      hostLink: '',
      creditBalance: 0,
      stats: { totalInvited: 0, completedStays: 0, pendingStays: 0, totalCreditsEarned: 0, creditBalance: 0 },
      invites: [],
      affiliate: null,
    });
  }
}
