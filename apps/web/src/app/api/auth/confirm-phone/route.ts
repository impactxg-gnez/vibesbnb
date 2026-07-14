import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getFirebaseAdminAuth, isFirebaseAdminConfigured } from '@/lib/firebase/admin';
import { normalizePhoneE164 } from '@/lib/auth/phone';
import { syncProfileFromAuthUser } from '@/lib/supabase/syncProfileFromAuthUser';

export const dynamic = 'force-dynamic';

/**
 * After Firebase Phone Auth confirms an OTP, mark the phone verified on the
 * logged-in Supabase user (phone_confirm) and sync profiles.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { error: 'Firebase Admin is not configured on this deployment.' },
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
    const meta = { ...(user.user_metadata || {}) };
    const { data: updated, error: updateError } = await service.auth.admin.updateUserById(
      user.id,
      {
        phone: phoneCheck.phone,
        phone_confirm: true,
        user_metadata: {
          ...meta,
          phone: phoneCheck.phone,
          phone_verified: true,
        },
      }
    );

    if (updateError) {
      console.error('[confirm-phone] updateUserById:', updateError.message);
      return NextResponse.json(
        { error: updateError.message || 'Failed to save verified phone' },
        { status: 500 }
      );
    }

    await syncProfileFromAuthUser(updated.user ?? user);

    return NextResponse.json({
      ok: true,
      phone: phoneCheck.phone,
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
