import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import type { ConciergeChatMessage } from '@/lib/concierge/types';

export const dynamic = 'force-dynamic';

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      const supabase = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data } = await supabase.auth.getUser(token);
      return data.user;
    }
  }
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ messages: [] });
    }
    const service = createServiceClient();
    const { data, error } = await service
      .from('vibe_bot_messages')
      .select('id, role, body, listings, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(80);

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ messages: [] });
      throw error;
    }

    const messages: ConciergeChatMessage[] = (data || []).map((row) => ({
      id: String(row.id),
      role: row.role === 'user' ? 'user' : 'assistant',
      body: String(row.body || ''),
      listings: Array.isArray(row.listings) ? row.listings : undefined,
      createdAt: String(row.created_at),
    }));

    await service
      .from('vibe_bot_threads')
      .update({ guest_read_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    console.warn('[concierge/messages GET]', error);
    return NextResponse.json({ messages: [] });
  }
}
