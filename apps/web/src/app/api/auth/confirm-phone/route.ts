import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';
import { getFirebaseAdminAuth, isFirebaseAdminConfigured } from '@/lib/firebase/admin';
import { normalizePhoneE164 } from '@/lib/auth/phone';
import { syncProfileFromAuthUser } from '@/lib/supabase/syncProfileFromAuthUser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'object') {
    const o = error as { message?: string; msg?: string; code?: string };
    const text = o.message || o.msg || o.code;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return '';
}

function withVerifiedPhoneMeta(user: User, phone: string): User {
  return {
    ...user,
    user_metadata: {
      ...(user.user_metadata || {}),
      phone,
      phone_verified: true,
    },
  };
}

/**
 * After Firebase Phone Auth confirms an OTP, mark the phone verified on the
 * logged-in Supabase user. Binding `auth.users.phone` requires the Phone
 * provider; we always persist `user_metadata.phone_verified` so booking gates
 * still work when that provider is disabled (the intended setup).
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { error: 'Firebase Admin is not configured on this deployment.' },
        { status: 503 }
      );
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: 'Phone verification cannot be saved. Server is missing the service role key.' },
        { status: 503 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const firebaseIdToken =
      typeof body.firebaseIdToken === 'string' ? body.firebaseIdToken.trim() : '';
    const rawPhone = typeof body.phone === 'string' ? body.phone : '';

    if (!firebaseIdToken) {
      return NextResponse.json({ error: 'Missing firebaseIdToken' }, { status: 400 });
    }

    const phoneCheck = normalizePhoneE164(rawPhone);
    if (!phoneCheck.ok) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }

    const decoded = await getFirebaseAdminAuth().verifyIdToken(firebaseIdToken);
    const tokenPhone =
      typeof decoded.phone_number === 'string' ? decoded.phone_number.trim() : '';

    if (!tokenPhone) {
      return NextResponse.json(
        { error: 'Firebase token does not include a verified phone number.' },
        { status: 400 }
      );
    }

    if (tokenPhone !== phoneCheck.phone) {
      return NextResponse.json(
        { error: 'Verified phone does not match the number you entered.' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const { data: freshWrap, error: freshError } = await service.auth.admin.getUserById(user.id);
    if (freshError || !freshWrap.user) {
      console.error('[confirm-phone] getUserById:', authErrorMessage(freshError));
      return NextResponse.json(
        { error: authErrorMessage(freshError) || 'Could not load your account to save the phone.' },
        { status: 500 }
      );
    }

    const target = freshWrap.user;
    const verifiedMeta = {
      ...(target.user_metadata || {}),
      phone: phoneCheck.phone,
      phone_verified: true,
    };
    const existingPhone = typeof target.phone === 'string' ? target.phone.trim() : '';

    let saved = target;
    let phoneBoundToAuth = false;

    const bindPhone =
      existingPhone === phoneCheck.phone
        ? { phone_confirm: true as const, user_metadata: verifiedMeta }
        : {
            phone: phoneCheck.phone,
            phone_confirm: true as const,
            user_metadata: verifiedMeta,
          };

    const { data: bound, error: bindError } = await service.auth.admin.updateUserById(
      user.id,
      bindPhone
    );

    if (!bindError) {
      saved = bound.user ?? target;
      phoneBoundToAuth = true;
    } else {
      console.warn('[confirm-phone] auth.users.phone bind skipped:', authErrorMessage(bindError));
      const { data: metaUpdated, error: metaError } = await service.auth.admin.updateUserById(
        user.id,
        { user_metadata: verifiedMeta }
      );
      if (metaError) {
        console.error('[confirm-phone] metadata update:', authErrorMessage(metaError));
        return NextResponse.json(
          {
            error:
              authErrorMessage(metaError) ||
              authErrorMessage(bindError) ||
              'Failed to save verified phone',
          },
          { status: 500 }
        );
      }
      saved = metaUpdated.user ?? withVerifiedPhoneMeta(target, phoneCheck.phone);
    }

    await syncProfileFromAuthUser(withVerifiedPhoneMeta(saved, phoneCheck.phone));

    return NextResponse.json({
      ok: true,
      phone: phoneCheck.phone,
      phoneBoundToAuth,
    });
  } catch (e: unknown) {
    console.error('[confirm-phone]', e);
    const message = e instanceof Error ? e.message : 'Phone confirmation failed';
    const isFirebase =
      message.toLowerCase().includes('firebase') ||
      message.toLowerCase().includes('token') ||
      message.toLowerCase().includes('auth');
    return NextResponse.json(
      { error: isFirebase ? message : 'Phone confirmation failed' },
      { status: 500 }
    );
  }
}
