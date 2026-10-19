import { NextRequest, NextResponse } from 'next/server';
import { runGeminiConcierge } from '@/lib/concierge/geminiConcierge';
import { heuristicStaySearch, looksLikeStayRequest } from '@/lib/concierge/heuristicSearch';
import { runMuseConcierge } from '@/lib/concierge/museSpark';
import { searchStays } from '@/lib/concierge/searchStays';
import type { ConciergeChatMessage, StayCard } from '@/lib/concierge/types';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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

async function persist(
  userId: string,
  role: 'user' | 'assistant',
  body: string,
  listings?: StayCard[]
) {
  try {
    const service = createServiceClient();
    await service.from('vibe_bot_messages').insert({
      user_id: userId,
      role,
      body,
      listings: listings || null,
    });
    await service.from('vibe_bot_threads').upsert({
      user_id: userId,
      last_message: body.slice(0, 280),
      last_message_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[concierge] persist skipped', e);
  }
}

function asHistory(raw: unknown): ConciergeChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is ConciergeChatMessage =>
      !!m &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.body === 'string'
  );
}

const CHAT_FALLBACK =
  'I am VibeBot, the VibesBNB concierge. Ask me a question, or tell me a neighborhood, dates, guests, and budget if you want listing links.';

async function runHeuristic(message: string): Promise<{ reply: string; listings: StayCard[] }> {
  if (!looksLikeStayRequest(message)) {
    return { reply: CHAT_FALLBACK, listings: [] };
  }
  const found = await searchStays(heuristicStaySearch(message));
  return { reply: found.summary, listings: found.listings };
}

async function runConcierge(
  message: string,
  history: ConciergeChatMessage[]
): Promise<{ reply: string; listings: StayCard[] }> {
  const provider = (process.env.CONCIERGE_PROVIDER || '').trim().toLowerCase();
  const museKey = process.env.MODEL_API_KEY?.trim();
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  const preferMuse = provider === 'muse' && Boolean(museKey);

  if (preferMuse && museKey) {
    try {
      const result = await runMuseConcierge(museKey, message, history);
      if (result.reply || result.listings.length) return result;
    } catch (error) {
      console.error('[concierge] Muse failed, falling back', error);
    }
  }

  if (geminiKey) {
    try {
      const result = await runGeminiConcierge(geminiKey, message, history);
      if (result.reply || result.listings.length) return result;
    } catch (error) {
      if (preferMuse) {
        console.error('[concierge] Gemini fallback failed', error);
      } else {
        throw error;
      }
    }
  }

  return runHeuristic(message);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (user) {
      await persist(user.id, 'user', message);
    }

    let { reply, listings } = await runConcierge(message, asHistory(body.history));

    if (!looksLikeStayRequest(message)) {
      listings = [];
    }

    if (!reply && listings.length) {
      const found = await runHeuristic(message);
      listings = found.listings;
      reply = found.reply;
    }

    if (!reply) {
      reply = looksLikeStayRequest(message)
        ? 'Tell me a neighborhood, dates, how many guests, and a nightly budget. I will send matching VibesBNB links.'
        : CHAT_FALLBACK;
    }

    if (user) {
      await persist(user.id, 'assistant', reply, listings);
    }

    const assistant: ConciergeChatMessage = {
      id: `local-${Date.now()}`,
      role: 'assistant',
      body: reply,
      listings,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ message: assistant });
  } catch (error: unknown) {
    console.error('[concierge/chat]', error);
    const err = error instanceof Error ? error.message : 'VibeBot could not reply';
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
