import { NextRequest, NextResponse } from 'next/server';
import {
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
  const home = new URL('/', request.url);
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
  const signup = new URL('/signup', request.url);
  if (known) signup.searchParams.set('ref', known);
  const response = NextResponse.redirect(signup);
  if (known) {
    response.cookies.set(REFERRAL_CODE_COOKIE, known, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  return response;
}
