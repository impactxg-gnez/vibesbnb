import { NextRequest, NextResponse } from 'next/server';
import type { User, UserResponse } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';
import {
  isFirebaseIdLookupConfigured,
  phoneFromFirebaseIdToken,
} from '@/lib/firebase/verifyPhoneIdToken';
import { normalizePhoneE164 } from '@/lib/auth/phone';
import { syncProfileFromAuthUser } from '@/lib/supabase/syncProfileFromAuthUser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

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

async function updateAuthUser(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  attributes: Parameters<typeof service.auth.admin.updateUserById>[1]
): Promise<UserResponse> {
  try {
    return await service.auth.admin.updateUserById(userId, attributes);
  } catch (error) {
    return { data: { user: null }, error: error as UserResponse['error'] };
  }
}

/**
 * After Firebase Phone Auth confirms an OTP, mark the phone verified on the
 * logged-in Supabase user. Binding `auth.users.phone` requires the Phone
 * provider; we always persist `user_metadata.phone_verified` so booking gates
 * still work when that provider is disabled (the intended setup).
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseIdLookupConfigured()) {
      return jsonError('Firebase is not configured on this deployment.', 503);
    }

    if (!hasServiceRoleKey()) {
      return jsonError(
        'Phone verification cannot be saved. Server is missing the service role key.',
        503
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json().catch(() => ({}));
    const firebaseIdToken =
      typeof body.firebaseIdToken === 'string' ? body.firebaseIdToken.trim() : '';
    const rawPhone = typeof body.phone === 'string' ? body.phone : '';

    if (!firebaseIdToken) {
      return jsonError('Missing firebaseIdToken', 400);
    }

    const phoneCheck = normalizePhoneE164(rawPhone);
    if (!phoneCheck.ok) {
      return jsonError(phoneCheck.error, 400);
    }

    const tokenCheck = await phoneFromFirebaseIdToken(firebaseIdToken);
    if (!tokenCheck.ok) {
      return jsonError(tokenCheck.error, 401);
    }

    if (tokenCheck.phone !== phoneCheck.phone) {
      return jsonError('Verified phone does not match the number you entered.', 400);
    }

    const service = createServiceClient();
    const { data: freshWrap, error: freshError } = await service.auth.admin.getUserById(user.id);
    if (freshError || !freshWrap.user) {
      console.error('[confirm-phone] getUserById:', authErrorMessage(freshError));
      return jsonError(
        authErrorMessage(freshError) || 'Could not load your account to save the phone.',
        500
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

    const bound = await updateAuthUser(service, user.id, bindPhone);

    if (!bound.error) {
      saved = bound.data.user ?? target;
      phoneBoundToAuth = true;
    } else {
      console.warn('[confirm-phone] auth.users.phone bind skipped:', authErrorMessage(bound.error));
      const metaUpdated = await updateAuthUser(service, user.id, { user_metadata: verifiedMeta });
      if (metaUpdated.error) {
        console.error('[confirm-phone] metadata update:', authErrorMessage(metaUpdated.error));
        return jsonError(
          authErrorMessage(metaUpdated.error) ||
            authErrorMessage(bound.error) ||
            'Failed to save verified phone',
          500
        );
      }
      saved = metaUpdated.data.user ?? withVerifiedPhoneMeta(target, phoneCheck.phone);
    }

    await syncProfileFromAuthUser(withVerifiedPhoneMeta(saved, phoneCheck.phone));

    return NextResponse.json({
      ok: true,
      phone: phoneCheck.phone,
      phoneBoundToAuth,
    });
  } catch (e: unknown) {
    console.error('[confirm-phone]', e);
    const message = authErrorMessage(e) || 'Phone confirmation failed';
    return jsonError(message, 500);
  }
}
