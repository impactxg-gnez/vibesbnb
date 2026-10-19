import { NextRequest, NextResponse } from 'next/server';
import { listConciergeChats } from '@/lib/concierge/persistConcierge';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

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
    if (!user) return NextResponse.json({ chats: [] });
    const chats = await listConciergeChats(user.id);
    return NextResponse.json({ chats });
  } catch (error: unknown) {
    console.warn('[concierge/chats GET]', error);
    return NextResponse.json({ chats: [] });
  }
}
