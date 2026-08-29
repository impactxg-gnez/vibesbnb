import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const platform = typeof body?.platform === 'string' ? body.platform.trim().slice(0, 32) : 'expo';

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Valid push token is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authHeader = request.headers.get('Authorization');
    const bearer = authHeader?.replace(/^Bearer\s+/i, '').trim();

    const supabase = bearer
      ? createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
        })
      : createClient(supabaseUrl, anonKey);

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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to register device';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
