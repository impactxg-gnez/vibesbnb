import { NextRequest, NextResponse } from 'next/server';
import {
  appOrigin,
  isReferralAffiliateEnabled,
  REFERRAL_CODE_COOKIE,
} from '@/lib/referrals/config';
import { normalizeCode } from '@/lib/referrals/logic';
import { lookupReferralCode } from '@/lib/referrals/store';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const origin = appOrigin();
  const home = new URL('/', origin);
  if (!isReferralAffiliateEnabled()) {
    return NextResponse.redirect(home);
  }

  const code = normalizeCode(params.code);
  let known: string | null = null;
  try {
    known = code ? await lookupReferralCode(code) : null;
  } catch (error) {
    console.warn('[referrals] link lookup failed', error);
  }

  // Canonical destination on vibesbnb.com (or localhost in dev)
  const signup = new URL('/signup', origin);
  const activeCode = known || code;
  if (activeCode) {
    signup.searchParams.set('ref', activeCode);
  }

  // Forward query params (e.g. ?type=host)
  const incoming = new URL(request.url);
  const typeParam = incoming.searchParams.get('type');
  if (typeParam) {
    signup.searchParams.set('type', typeParam);
  }

  const response = NextResponse.redirect(signup);
  if (activeCode) {
    response.cookies.set(REFERRAL_CODE_COOKIE, activeCode, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  return response;
}
