import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Legacy: creates a host with a pre-confirmed email (admin client).
 * Prefer email signup via `signUp` on the signup page (verify email → host dashboard).
 * Does not enqueue admin host approval; listings are still moderated separately.
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey || supabaseUrl === 'https://placeholder.supabase.co') {
      return NextResponse.json(
        { error: 'Host registration requires Supabase service role configuration.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'host',
      },
    });

    if (createError || !created.user) {
      const msg = createError?.message || 'Failed to create account';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Sign in or use a different email.' },
          { status: 409 }
        );
      }
      console.error('[register-host] createUser:', createError);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = created.user.id;

    const { error: profileErr } = await admin.from('profiles').upsert(
      {
        id: userId,
        full_name: name,
        role: 'host',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (profileErr) {
      console.warn('[register-host] profiles upsert:', profileErr);
    }

    return NextResponse.json({ success: true, userId });
  } catch (e: unknown) {
    console.error('[register-host]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
