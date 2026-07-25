import { NextRequest, NextResponse } from 'next/server';
import { validateSignupEmail } from '@/lib/auth/validateSignupEmail';
import { sendSignupVerificationEmail } from '@/lib/auth/sendSignupVerificationEmail';

/**
 * Sends signup verification via Resend (admin-generated Supabase link).
 * Used after signUp and from /verify-email "Resend".
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailCheck = validateSignupEmail(String(body?.email || ''));
    if (!emailCheck.ok) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    const originRaw =
      typeof body?.origin === 'string' && body.origin.trim()
        ? body.origin.trim().replace(/\/$/, '')
        : request.nextUrl.origin;

    let origin = originRaw;
    try {
      const u = new URL(originRaw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 400 });
      }
      origin = u.origin;
    } catch {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 400 });
    }

    const result = await sendSignupVerificationEmail({
      email: emailCheck.email,
      origin,
      password: typeof body?.password === 'string' ? body.password : undefined,
      fullName: typeof body?.fullName === 'string' ? body.fullName : undefined,
      role: typeof body?.role === 'string' ? body.role : undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, sent: result.sent });
  } catch (e: unknown) {
    console.error('[api/auth/send-verification-email]', e);
    const message = e instanceof Error ? e.message : 'Failed to send verification email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
