import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const platform = typeof body?.platform === 'string' ? body.platform.trim().slice(0, 32) : 'expo';

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Valid push token is required' }, { status: 400 });
    }

    const { error } = await supabase.from('device_push_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform: platform || 'expo',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

    if (error) {
      console.error('[register-device]', error);
      return NextResponse.json(
        { error: 'Could not save token. Run SUPABASE_DEVICE_PUSH_TOKENS.sql if the table is missing.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to register device' },
      { status: 500 }
    );
  }
}
